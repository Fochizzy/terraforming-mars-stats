from pathlib import Path

DASHBOARD = Path('src/features/insights/insights-dashboard.tsx')
TEST = Path('src/features/insights/insights-dashboard.test.tsx')

source = DASHBOARD.read_text()
import_anchor = "import { buildInsightCards } from './build-insight-cards';\n"
new_import = "import { ScoreProfilePanel } from './score-profile-panel';\n"
if new_import not in source:
    source = source.replace(import_anchor, import_anchor + new_import)

old_block = '''          <ChartFrame
            title={
              selectedPlayer
                ? `Score Profile for ${selectedPlayer.displayName}`
                : 'Group Score Profile'
            }
          >
            {scoreSourceData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Score-source averages will appear here after finalized games exist.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <BarChart
                  data={scoreSourceData}
                  height={340}
                  layout="vertical"
                  margin={{ bottom: 12, left: 48, right: 12, top: 12 }}
                  width={340}
                >
                  <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
                  <XAxis tick={{ fill: '#d6d3d1', fontSize: 12 }} type="number" />
                  <YAxis
                    dataKey="label"
                    tick={{ fill: '#d6d3d1', fontSize: 12 }}
                    type="category"
                    width={88}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1c1917',
                      border: '1px solid #7c2d12',
                      borderRadius: '12px',
                      color: '#f5f5f4',
                    }}
                  />
                  <Bar dataKey="value" fill="#38bdf8" radius={[0, 10, 10, 0]} />
                </BarChart>
              </div>
            )}
          </ChartFrame>
'''
new_block = '''          <ScoreProfilePanel
            entries={scoreSourceData}
            subjectName={selectedPlayer?.displayName ?? null}
          />
'''
if old_block not in source:
    raise SystemExit('Score profile block was not found; refusing to modify dashboard.')
source = source.replace(old_block, new_block)
DASHBOARD.write_text(source)

test_source = TEST.read_text()
test_source = test_source.replace(
    "expect(screen.getByRole('heading', { name: /Group Score Profile/i })).toBeInTheDocument();",
    "expect(screen.getByRole('heading', { name: /Group Scoring DNA/i })).toBeInTheDocument();\n    expect(screen.getByText(/Terraforming-focused/i)).toBeInTheDocument();\n    expect(screen.getByText(/Average score/i)).toBeInTheDocument();",
)
test_source = test_source.replace(
    "expect(screen.getByRole('heading', { name: /Score Profile for Second Seat/i })).toBeInTheDocument();",
    "expect(screen.getByRole('heading', { name: /Scoring DNA for Second Seat/i })).toBeInTheDocument();",
)
TEST.write_text(test_source)

Path('.github/workflows/apply-scoring-dna.yml').unlink(missing_ok=True)
Path('scripts/apply-scoring-dna.py').unlink(missing_ok=True)
