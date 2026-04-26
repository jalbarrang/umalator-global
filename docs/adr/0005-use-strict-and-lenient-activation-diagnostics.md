# Use strict and lenient activation diagnostics

Unsupported or unmodeled activation mechanics produce **Activation Diagnostics**, with strict compilation throwing and lenient compilation disabling or skipping affected opportunities while surfacing the diagnostic. We chose this over silent fallbacks or universal hard failures because simulator fidelity requires explicit visibility into missing mechanics, but the user-facing app should not crash an entire simulation just because a future skill contains a condition or value behavior that has not yet been reverse engineered.
