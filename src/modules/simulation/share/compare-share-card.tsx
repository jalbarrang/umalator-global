import { forwardRef, type ComponentProps } from 'react';
import { ShareCard } from '@/modules/runners/share';

const FONT_STACK = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const COLORS = {
  bg: '#101010',
  surface: '#171717',
  text: '#fafafa',
  textSecondary: '#a1a1a1',
  border: '#282828',
} as const;

const HIGHLIGHT_ACCENT = '#57a112';

export type CompareShareStatRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type CompareShareCardProps = {
  shareCard: ComponentProps<typeof ShareCard>;
  raceSummary: string;
  meanLengths: string | null;
  sampleCount: number;
  seedDisplay: string;
  statRows: CompareShareStatRow[];
};

export const CompareShareCard = forwardRef<HTMLDivElement, CompareShareCardProps>(
  function CompareShareCard(
    {
      shareCard,
      raceSummary,
      meanLengths,
      sampleCount,
      seedDisplay,
      statRows,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 16,
          width: 920,
          boxSizing: 'border-box',
          padding: 12,
          fontFamily: FONT_STACK,
          backgroundColor: COLORS.bg,
          color: COLORS.text,
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <ShareCard {...shareCard} />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: COLORS.bg,
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 6,
              }}
            >
              Race settings
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.45, color: COLORS.textSecondary }}>
              {raceSummary}
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px 12px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 6,
                }}
              >
                Result summary
              </div>
              {meanLengths !== null && (
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ color: COLORS.textSecondary }}>Mean length diff: </span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.abs(Number(meanLengths)).toFixed(2)}
                  </span>
                </div>
              )}
              <div
                style={{ fontSize: 13, lineHeight: 1.5, marginTop: meanLengths !== null ? 2 : 0 }}
              >
                <span style={{ color: COLORS.textSecondary }}>Samples: </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {sampleCount}
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>
                <span style={{ color: COLORS.textSecondary }}>Seed: </span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                  {seedDisplay}
                </span>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 8,
                }}
              >
                Runner stats
              </div>
              <div
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.surface,
                }}
              >
                {statRows.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: i < statRows.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                      borderLeft: row.highlight
                        ? `3px solid ${HIGHLIGHT_ACCENT}`
                        : '3px solid transparent',
                      backgroundColor: row.highlight ? 'rgba(87, 161, 18, 0.08)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontFamily: 'ui-monospace, monospace',
                        fontVariantNumeric: 'tabular-nums',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        textAlign: 'right',
                        minWidth: 0,
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '4px 14px 10px',
              fontSize: 10,
              color: COLORS.textSecondary,
              fontStyle: 'italic',
              textAlign: 'right',
            }}
          >
            Showing mean results
          </div>
        </div>
      </div>
    );
  },
);
