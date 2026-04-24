import type { VoteAggregation } from '../../types/classroom';
import './VoteDashboard.css';

interface VoteDashboardProps {
    aggregation: VoteAggregation;
    expected?: number;
    paletteOptions: string[];
    detailOptions: string[];
}

const L = {
    participants: '참여 인원',
    expected: '예상',
    keywordCloud: '키워드 분포',
    palettes: '선 굵기 선택',
    details: '디테일 선택',
    top: '최다 선택',
    noVotes: '아직 투표가 없습니다.',
    votesSuffix: '표',
    percentSuffix: '퍼센트',
};

function keywordFontSize(count: number): number {
    // 14 + count*6, capped at 38 for classroom-projector legibility.
    return Math.min(38, 14 + count * 6);
}

function BarRow({
    label,
    count,
    total,
    isTop,
}: {
    label: string;
    count: number;
    total: number;
    isTop: boolean;
}) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const pct = Math.round(percentage);
    return (
        <div
            className={`vote-dashboard__bar${isTop ? ' vote-dashboard__bar--top' : ''}`}
            role="img"
            aria-label={`${label}: ${count}${L.votesSuffix}, ${pct}${L.percentSuffix}`}
        >
            <div className="vote-dashboard__bar-header">
                <span className="vote-dashboard__bar-label">
                    {label}
                    {isTop && count > 0 && (
                        <span className="vote-dashboard__bar-top-badge">★ {L.top}</span>
                    )}
                </span>
                <span className="vote-dashboard__bar-value">
                    {count} ({pct}%)
                </span>
            </div>
            <div className="vote-dashboard__bar-track">
                <div
                    className="vote-dashboard__bar-fill"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export default function VoteDashboard({
    aggregation,
    expected,
    paletteOptions,
    detailOptions,
}: VoteDashboardProps) {
    const topKeyword = aggregation.keywords[0]?.value ?? null;
    const topPalette = aggregation.palettes[0]?.value ?? null;
    const topDetail = aggregation.details[0]?.value ?? null;

    // Stable ordering: preserve the option order the teacher set, not the
    // sort-by-count order (so rows don't jump around).
    const paletteTotal = aggregation.palettes.reduce((s, p) => s + p.count, 0);
    const detailTotal = aggregation.details.reduce((s, d) => s + d.count, 0);

    const paletteRow = paletteOptions.map((opt) => ({
        value: opt,
        count: aggregation.palettes.find((p) => p.value === opt)?.count ?? 0,
    }));
    const detailRow = detailOptions.map((opt) => ({
        value: opt,
        count: aggregation.details.find((d) => d.value === opt)?.count ?? 0,
    }));

    return (
        <div className="vote-dashboard">
            <div className="vote-dashboard__counter">
                <div className="vote-dashboard__counter-label">{L.participants}</div>
                <div className="vote-dashboard__counter-value">
                    {aggregation.total}
                    {typeof expected === 'number' && expected > 0 && (
                        <span className="vote-dashboard__counter-expected">
                            / {L.expected} {expected}
                        </span>
                    )}
                </div>
            </div>

            <section className="vote-dashboard__section">
                <h4 className="vote-dashboard__section-title">{L.keywordCloud}</h4>
                {aggregation.keywords.length === 0 ? (
                    <p className="vote-dashboard__empty">{L.noVotes}</p>
                ) : (
                    <div className="vote-dashboard__cloud">
                        {aggregation.keywords.map(({ value, count }) => (
                            <span
                                key={value}
                                className={`vote-dashboard__keyword${value === topKeyword ? ' vote-dashboard__keyword--top' : ''}`}
                                style={{ fontSize: `${keywordFontSize(count)}px` }}
                                title={`${value}: ${count}`}
                                aria-label={`${value} ${count}${L.votesSuffix}`}
                            >
                                {value}
                                <small className="vote-dashboard__keyword-count"> {count}</small>
                            </span>
                        ))}
                    </div>
                )}
            </section>

            <section className="vote-dashboard__section">
                <h4 className="vote-dashboard__section-title">{L.palettes}</h4>
                {paletteTotal === 0 ? (
                    <p className="vote-dashboard__empty">{L.noVotes}</p>
                ) : (
                    <div className="vote-dashboard__bars">
                        {paletteRow.map(({ value, count }) => (
                            <BarRow
                                key={value}
                                label={value}
                                count={count}
                                total={paletteTotal}
                                isTop={value === topPalette}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="vote-dashboard__section">
                <h4 className="vote-dashboard__section-title">{L.details}</h4>
                {detailTotal === 0 ? (
                    <p className="vote-dashboard__empty">{L.noVotes}</p>
                ) : (
                    <div className="vote-dashboard__bars">
                        {detailRow.map(({ value, count }) => (
                            <BarRow
                                key={value}
                                label={value}
                                count={count}
                                total={detailTotal}
                                isTop={value === topDetail}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
