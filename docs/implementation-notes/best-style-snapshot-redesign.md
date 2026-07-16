# Best Style Snapshot redesign

This change gives the existing Best Style Snapshot section a dedicated responsive layout without changing its analytics data contract.

## Layout behavior

- Wide screens use a two-column chart-and-detail layout.
- Medium screens place the three style summaries in a single row beneath the chart.
- Small screens stack the chart and summaries vertically.
- The leading style receives a stronger orange accent and inset indicator.

## Data behavior

The section continues to use the existing style-performance chart and detail rows from `InsightsDashboard`. No database or Supabase migration is required.
