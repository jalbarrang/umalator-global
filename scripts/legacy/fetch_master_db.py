#!/usr/bin/env python3
"""
Master Database Fetcher for Uma Musume Pretty Derby

This tool automates the entire manifest chain to retrieve master.mdb:

    app-ver → root manifest → platform manifest → master manifest → master.mdb

Manifest Chain:
    1. Root Manifest     - Lists available platforms (Windows, iOS, Android)
    2. Platform Manifest - Lists content categories (master, chara, live, etc.)
    3. Master Manifest   - Lists master database files
    4. master.mdb        - SQLite database with game data

URL Patterns:
    Root:     {base}/dl/vertical/{app_ver}/manifests/manifestdat/root.manifest.bsv.lz4
    Manifest: {base}/dl/vertical/resources/Manifest/{hname[:2]}/{hname}
    Generic:  {base}/dl/vertical/resources/Generic/{hname[:2]}/{hname}

HName Calculation:
    hname = Base32(SHA1(checksum[8B BE] + size[8B BE] + name))

Usage:
    python fetch_master_db.py <app_ver> [--output <dir>] [--platform <Windows|iOS|Android>]

Examples:
    python fetch_master_db.py 10004010
    python fetch_master_db.py 10004010 --output ./downloads
    python fetch_master_db.py 10004010 --platform Android --quiet

Requirements:
    - Python 3.7+
    - lz4 (pip install lz4)

Version: 1.1
Date: 2026-02-02
"""

import os
import sys
import struct
import hashlib
import base64
import argparse
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Tuple

# Optional imports
try:
    import urllib.request
    import urllib.error
    HAS_URLLIB = True
except ImportError:
    HAS_URLLIB = False

try:
    import lz4.frame
    import lz4.block
    HAS_LZ4 = True
except ImportError:
    HAS_LZ4 = False


# =============================================================================
# CONSTANTS
# =============================================================================

# Base URL for Uma Musume EN assets
BASE_URL = "https://assets-umamusume-en.akamaized.net"

# URL path components
PATH_ROOT_MANIFEST = "dl/vertical/{app_ver}/manifests/manifestdat/root.manifest.bsv.lz4"
PATH_MANIFEST = "dl/vertical/resources/Manifest/{prefix}/{hname}"
PATH_GENERIC = "dl/vertical/resources/Generic/{prefix}/{hname}"

# BSV format constants
BSV_MAGIC = 0xBF
BSV_FORMAT_VERSION = 1
BSV_FORMAT_ANONYMOUS = 1

# LZ4 frame format magic (little-endian: 0x184D2204)
LZ4_FRAME_MAGIC = b'\x04\x22\x4D\x18'

# Default settings
DEFAULT_PLATFORM = "Windows"
DEFAULT_TIMEOUT = 30


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class ManifestEntry:
    """
    Entry from a manifest BSV file.
    
    Attributes:
        name: Asset name (e.g., "master.mdb.lz4", "story")
        size: Compressed file size in bytes
        checksum: 64-bit checksum for integrity verification
        hname: Computed hash name for URL construction
    """
    name: str
    size: int
    checksum: int
    hname: str = ""
    
    def __post_init__(self):
        if not self.hname:
            self.hname = calc_hname(self.checksum, self.size, self.name.encode('utf-8'))
    
    def __repr__(self) -> str:
        return f"ManifestEntry(name={self.name!r}, size={self.size:,}, hname={self.hname})"


@dataclass
class RootEntry:
    """
    Entry from root manifest (platform information).
    
    Attributes:
        platform: Platform name ("Windows", "iOS", "Android")
        size: Compressed size of the platform manifest
        checksum: 64-bit checksum of the platform manifest
    """
    platform: str
    size: int
    checksum: int
    
    @property
    def hname(self) -> str:
        """Compute the hash name for this platform's manifest."""
        return calc_hname(self.checksum, self.size, self.platform.encode('utf-8'))
    
    def __repr__(self) -> str:
        return f"RootEntry(platform={self.platform!r}, size={self.size}, hname={self.hname})"


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def calc_hname(checksum: int, size: int, name: bytes) -> str:
    """
    Calculate hash name (hname) for a manifest entry
    
    Formula: Base32(SHA1(checksum[8B BE] + size[8B BE] + name))
    """
    buffer = struct.pack('>QQ', checksum, size) + name
    sha1_hash = hashlib.sha1(buffer).digest()
    return base64.b32encode(sha1_hash).decode('ascii').rstrip('=')


def download_file(url: str, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    """
    Download a file from URL.
    
    Args:
        url: URL to download from
        timeout: Request timeout in seconds
    
    Returns:
        Downloaded file content as bytes
    
    Raises:
        RuntimeError: If urllib is not available or download fails
    """
    if not HAS_URLLIB:
        raise RuntimeError("urllib not available - cannot download files")
    
    headers = {
        'User-Agent': 'UnityPlayer/2022.3.46f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.reason} for {url}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"URL error: {e.reason} for {url}") from e


def is_lz4_compressed(data: bytes) -> bool:
    """Check if data is LZ4 frame compressed."""
    return len(data) >= 4 and data[:4] == LZ4_FRAME_MAGIC


def decompress_lz4(data: bytes) -> bytes:
    """
    Decompress LZ4 data.
    
    Supports both:
    - LZ4 Frame format (magic: 0x184D2204) - used by manifest files
    - LZ4 Block format with 4-byte size header - used by some assets
    
    Args:
        data: Compressed data
    
    Returns:
        Decompressed data
    
    Raises:
        RuntimeError: If lz4 library is not available
        ValueError: If data is too short
    """
    if not HAS_LZ4:
        raise RuntimeError("lz4 library not available. Install with: pip install lz4")
    
    if len(data) < 4:
        raise ValueError("Data too short for LZ4 header")
    
    # LZ4 Frame format (used by game manifests)
    if is_lz4_compressed(data):
        return lz4.frame.decompress(data)
    
    # LZ4 Block format with size header (used by some assets)
    uncompressed_size = struct.unpack('<I', data[:4])[0]
    return lz4.block.decompress(data[4:], uncompressed_size=uncompressed_size)


# =============================================================================
# BSV PARSING
# =============================================================================

class BSVParser:
    """Simple BSV parser that matches bsv_parser.py logic"""
    
    MAGIC_BYTE = 0xBF
    
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0
    
    def read_vlq(self, max_bytes: int = 8) -> int:
        """Read a variable-length quantity (MSB-first, big-endian style)"""
        value = 0
        bytes_read = 0
        
        while bytes_read < max_bytes and self.offset < len(self.data):
            b = self.data[self.offset]
            self.offset += 1
            bytes_read += 1
            
            # MSB-first: shift previous result left and add new 7 bits
            value = (value << 7) | (b & 0x7F)
            
            # If MSB is 0, we're done
            if (b & 0x80) == 0:
                break
        
        return value
    
    def read_unum(self, num_bytes: int) -> int:
        """Read unsigned integer (big-endian)"""
        value = int.from_bytes(self.data[self.offset:self.offset + num_bytes], 'big')
        self.offset += num_bytes
        return value
    
    def read_text(self) -> str:
        """Read null-terminated text"""
        start = self.offset
        while self.offset < len(self.data) and self.data[self.offset] != 0:
            self.offset += 1
        text = self.data[start:self.offset].decode('utf-8', errors='replace')
        self.offset += 1  # Skip null terminator
        return text


def parse_anonymous_bsv(data: bytes) -> Tuple[List[list], List[Tuple[int, Optional[int]]]]:
    """
    Parse an AnonymousSchemaBSV file matching bsv_parser.py logic
    
    Header structure (after magic + format byte):
        - header_size (2 bytes, big-endian)
        - row_count (VLQ)
        - max_row_size (VLQ)
        - schema_version (VLQ)
        - schema_count (VLQ)
        - For each schema: type_byte (1 byte), optional fixed_size (VLQ)
    
    Returns:
        (list of rows, list of schemas as (type, fixed_size) tuples)
    """
    if len(data) < 2:
        raise ValueError("BSV data too short")
    
    if data[0] != BSV_MAGIC:
        raise ValueError(f"Invalid BSV magic: expected 0x{BSV_MAGIC:02X}, got 0x{data[0]:02X}")
    
    # Parse format byte: upper 4 bits = version, lower 4 bits = format type
    format_byte = data[1]
    version = (format_byte >> 4) & 0x0F
    format_type = format_byte & 0x0F
    
    if version != BSV_FORMAT_VERSION:
        raise ValueError(f"Unsupported BSV version: {version}, expected {BSV_FORMAT_VERSION}")
    if format_type != BSV_FORMAT_ANONYMOUS:
        raise ValueError(f"Expected ANONYMOUS format ({BSV_FORMAT_ANONYMOUS}), got {format_type}")
    
    parser = BSVParser(data)
    parser.offset = 2  # Skip magic + format byte
    
    # Read anonymous schema header
    header_size = parser.read_unum(2)
    row_count = parser.read_vlq()
    max_row_size = parser.read_vlq()
    schema_version = parser.read_vlq()
    schema_count = parser.read_vlq()
    
    # Read schema definitions
    schemas = []
    for _ in range(schema_count):
        type_byte = parser.data[parser.offset]
        parser.offset += 1
        
        fixed_size = None
        # Check if this type has a fixed size: ((type - 0x21) & 0xCF) == 0 and type != 0x51
        if ((type_byte - 0x21) & 0xCF) == 0 and type_byte != 0x51:
            fixed_size = parser.read_vlq()
        
        schemas.append((type_byte, fixed_size))
    
    # Read rows
    rows = []
    for _ in range(row_count):
        row = []
        for type_byte, fixed_size in schemas:
            base_type = type_byte & 0xF0
            
            if type_byte == 0x40 or base_type == 0x40:  # TEXT (null-terminated)
                text = parser.read_text()
                row.append(text)
            elif type_byte in (0x11, 0x12, 0x13) or base_type == 0x10:  # VLQ integer
                value = parser.read_vlq()
                row.append(value)
            elif fixed_size is not None:  # Fixed-size integer
                value = parser.read_unum(fixed_size)
                row.append(value)
            else:
                raise ValueError(f"Unknown type: 0x{type_byte:02X}")
        
        rows.append(row)
    
    return rows, schemas


def parse_root_manifest(data: bytes) -> List[RootEntry]:
    """Parse root manifest into RootEntry objects"""
    rows, schemas = parse_anonymous_bsv(data)
    
    entries = []
    for row in rows:
        if len(row) >= 3:
            entries.append(RootEntry(
                platform=row[0],
                size=row[1],
                checksum=row[2]
            ))
    
    return entries


def parse_content_manifest(data: bytes) -> List[ManifestEntry]:
    """
    Parse a content manifest (platform or category) into ManifestEntry objects
    
    Handles both 3-column (simple) and 7-column (full asset) formats:
    - Simple: name, size, checksum
    - Full: name, deps, group, priority, size, checksum, key
    """
    rows, schemas = parse_anonymous_bsv(data)
    
    entries = []
    for row in rows:
        if len(row) >= 7:
            # Full asset format
            entries.append(ManifestEntry(
                name=row[0],
                size=row[4],
                checksum=row[5]
            ))
        elif len(row) >= 3:
            # Simple format
            entries.append(ManifestEntry(
                name=row[0],
                size=row[1],
                checksum=row[2]
            ))
    
    return entries


# =============================================================================
# URL BUILDERS
# =============================================================================

def get_root_manifest_url(app_ver: str) -> str:
    """Get URL for root manifest given an app version."""
    path = PATH_ROOT_MANIFEST.format(app_ver=app_ver)
    return f"{BASE_URL}/{path}"


def get_manifest_url(hname: str) -> str:
    """Get URL for a manifest file (platform or content category)."""
    path = PATH_MANIFEST.format(prefix=hname[:2], hname=hname)
    return f"{BASE_URL}/{path}"


def get_generic_url(hname: str) -> str:
    """Get URL for a generic asset (e.g., master.mdb.lz4)."""
    path = PATH_GENERIC.format(prefix=hname[:2], hname=hname)
    return f"{BASE_URL}/{path}"


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def fetch_master_db(
    app_ver: str,
    platform: str = DEFAULT_PLATFORM,
    output_dir: str = ".",
    verbose: bool = True
) -> str:
    """
    Fetch master.mdb by following the manifest chain
    
    Steps:
        1. Download root manifest
        2. Parse to get platform manifest hname
        3. Download platform manifest  
        4. Find "master" entry
        5. Download master manifest
        6. Find "master.mdb.lz4" entry
        7. Download and decompress to master.mdb
    
    Args:
        app_ver: Application version (e.g., "10004010")
        platform: Target platform (Windows, iOS, Android)
        output_dir: Directory to save output files
        verbose: Print progress messages
    
    Returns:
        Path to the downloaded master.mdb file
    """
    
    def log(msg: str):
        if verbose:
            print(msg)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # ==========================================================================
    # STEP 1: Download Root Manifest
    # ==========================================================================
    log("=" * 70)
    log(f"STEP 1: Downloading Root Manifest (app-ver: {app_ver})")
    log("=" * 70)
    
    root_url = get_root_manifest_url(app_ver)
    log(f"URL: {root_url}")
    
    root_data_compressed = download_file(root_url)
    log(f"Downloaded: {len(root_data_compressed):,} bytes (compressed)")
    
    root_data = decompress_lz4(root_data_compressed)
    log(f"Decompressed: {len(root_data):,} bytes")
    
    # Save root manifest
    root_path = os.path.join(output_dir, "root.manifest.bsv")
    with open(root_path, 'wb') as f:
        f.write(root_data)
    log(f"Saved: {root_path}")
    
    # Parse root manifest
    root_entries = parse_root_manifest(root_data)
    log(f"\nFound {len(root_entries)} platform(s):")
    for entry in root_entries:
        log(f"  - {entry.platform}: size={entry.size}, checksum=0x{entry.checksum:016X}")
        log(f"    HName: {entry.hname}")
    
    # ==========================================================================
    # STEP 2: Download Platform Manifest
    # ==========================================================================
    log("\n" + "=" * 70)
    log(f"STEP 2: Downloading {platform} Manifest")
    log("=" * 70)
    
    # Find platform entry
    platform_entry = None
    for entry in root_entries:
        if entry.platform.lower() == platform.lower():
            platform_entry = entry
            break
    
    if not platform_entry:
        raise ValueError(f"Platform '{platform}' not found in root manifest")
    
    platform_url = get_manifest_url(platform_entry.hname)
    log(f"HName: {platform_entry.hname}")
    log(f"URL: {platform_url}")
    
    platform_data = download_file(platform_url)
    log(f"Downloaded: {len(platform_data):,} bytes")
    
    # Decompress if LZ4 compressed
    if is_lz4_compressed(platform_data):
        platform_data = decompress_lz4(platform_data)
        log(f"Decompressed: {len(platform_data):,} bytes")
    
    # Save platform manifest
    platform_path = os.path.join(output_dir, f"{platform}.manifest.bsv")
    with open(platform_path, 'wb') as f:
        f.write(platform_data)
    log(f"Saved: {platform_path}")
    
    # Parse platform manifest
    platform_entries = parse_content_manifest(platform_data)
    log(f"\nFound {len(platform_entries)} content categories:")
    for entry in platform_entries:
        log(f"  - {entry.name}: size={entry.size:,}, hname={entry.hname}")
    
    # ==========================================================================
    # STEP 3: Download Master Manifest
    # ==========================================================================
    log("\n" + "=" * 70)
    log("STEP 3: Downloading Master Manifest")
    log("=" * 70)
    
    # Find "master" entry
    master_entry = None
    for entry in platform_entries:
        if entry.name.lower() == "master":
            master_entry = entry
            break
    
    if not master_entry:
        raise ValueError("'master' entry not found in platform manifest")
    
    master_manifest_url = get_manifest_url(master_entry.hname)
    log(f"Master entry: size={master_entry.size}, checksum=0x{master_entry.checksum:016X}")
    log(f"HName: {master_entry.hname}")
    log(f"URL: {master_manifest_url}")
    
    master_manifest_data = download_file(master_manifest_url)
    log(f"Downloaded: {len(master_manifest_data):,} bytes")
    
    # Decompress if LZ4 compressed
    if is_lz4_compressed(master_manifest_data):
        master_manifest_data = decompress_lz4(master_manifest_data)
        log(f"Decompressed: {len(master_manifest_data):,} bytes")
    
    # Save master manifest
    master_manifest_path = os.path.join(output_dir, "master.manifest.bsv")
    with open(master_manifest_path, 'wb') as f:
        f.write(master_manifest_data)
    log(f"Saved: {master_manifest_path}")
    
    # Parse master manifest
    master_entries = parse_content_manifest(master_manifest_data)
    log(f"\nFound {len(master_entries)} entries in master manifest:")
    for entry in master_entries:
        log(f"  - {entry.name}: size={entry.size:,}, hname={entry.hname}")
    
    # ==========================================================================
    # STEP 4: Download master.mdb.lz4
    # ==========================================================================
    log("\n" + "=" * 70)
    log("STEP 4: Downloading master.mdb")
    log("=" * 70)
    
    # Find master.mdb.lz4 entry
    mdb_entry = None
    for entry in master_entries:
        if "master.mdb" in entry.name.lower():
            mdb_entry = entry
            break
    
    if not mdb_entry:
        raise ValueError("'master.mdb.lz4' entry not found in master manifest")
    
    mdb_url = get_generic_url(mdb_entry.hname)
    log(f"Entry: {mdb_entry.name}")
    log(f"Size: {mdb_entry.size:,} bytes")
    log(f"Checksum: 0x{mdb_entry.checksum:016X}")
    log(f"HName: {mdb_entry.hname}")
    log(f"URL: {mdb_url}")
    
    mdb_compressed = download_file(mdb_url)
    log(f"Downloaded: {len(mdb_compressed):,} bytes")
    
    # Decompress LZ4
    mdb_data = decompress_lz4(mdb_compressed)
    log(f"Decompressed: {len(mdb_data):,} bytes")
    
    # Save master.mdb
    mdb_path = os.path.join(output_dir, "master.mdb")
    with open(mdb_path, 'wb') as f:
        f.write(mdb_data)
    log(f"Saved: {mdb_path}")
    
    # ==========================================================================
    # DONE
    # ==========================================================================
    log("\n" + "=" * 70)
    log("SUCCESS!")
    log("=" * 70)
    log(f"\nmaster.mdb saved to: {mdb_path}")
    log(f"File size: {len(mdb_data):,} bytes ({len(mdb_data) / (1024*1024):.2f} MB)")
    
    return mdb_path


# =============================================================================
# CLI
# =============================================================================

def main() -> int:
    """
    CLI entry point.
    
    Returns:
        Exit code (0 for success, 1 for error)
    """
    parser = argparse.ArgumentParser(
        description="Fetch master.mdb from Uma Musume manifest chain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s 10004010
    %(prog)s 10004010 --output ./downloads
    %(prog)s 10004010 --platform Android --quiet

Manifest Chain:
    Root Manifest → Platform Manifest → Master Manifest → master.mdb
        """
    )
    
    parser.add_argument(
        "app_ver",
        help="Application version (e.g., 10004010)"
    )
    
    parser.add_argument(
        "--output", "-o",
        default=".",
        help="Output directory (default: current directory)"
    )
    
    parser.add_argument(
        "--platform", "-p",
        default=DEFAULT_PLATFORM,
        choices=["Windows", "iOS", "Android"],
        help=f"Target platform (default: {DEFAULT_PLATFORM})"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress messages"
    )
    
    args = parser.parse_args()
    
    try:
        output_path = fetch_master_db(
            app_ver=args.app_ver,
            platform=args.platform,
            output_dir=args.output,
            verbose=not args.quiet
        )
        print(f"\nOutput: {output_path}")
        return 0
    
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
