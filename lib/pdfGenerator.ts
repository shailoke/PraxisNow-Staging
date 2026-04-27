import PDFDocument from 'pdfkit';

/**
 * PraxisNow PDF Report Generator v3
 * Visual redesign: card-based layout, tighter type scale, left-accent bars.
 *
 * SCHEMA:
 * 1. tmay_analysis
 * 2. high_level_assessment
 * 3. competencies / dimension_scores  (performance scorecard)
 * 4. strengths
 * 5. areas_for_improvement
 * 6. answer_upgrades
 * 7. transcript_extracts + answer_level_diagnostics
 * 8. personal_answer_rules (Pro only)
 */

interface PDFMetadata {
    role: string;
    level: string;
    scenario: string;
    date: string;
    duration: string;
    session_id: string;
    session_type: string;
    dimension_order?: string[];
}

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const COLORS = {
    textPrimary:    '#030213',
    textSecondary:  '#5e5e6d',
    textMuted:      '#9a9aaa',
    backgroundPage: '#ffffff',
    backgroundCard: '#F8F7F4',
    borderSubtle:   '#E0DFDC',
    brandDark1:     '#0a0514',
    brandDark2:     '#1a0f2e',
    success:        '#2e7d32',
    successLight:   '#e8f5e9',
    warning:        '#b45309',
    warningLight:   '#fef3e2',
    danger:         '#c62828',
    dangerLight:    '#fde8e8',
    amber:          '#ca8a04',
};

const FONTS = {
    regular: 'Helvetica',
    bold:    'Helvetica-Bold',
    italic:  'Helvetica-Oblique',
};

const FONT_SIZES = {
    coverTitle:      34,
    sectionEyebrow:   9,
    sectionTitle:    13,
    subsectionTitle: 13,
    body:            11,
    small:            9,
};

const SPACING = {
    pageMargin:  52,
    cardPadding: 14,
    sectionGap:  28,
};

export async function generateSessionPDF(
    evaluation: any,
    metadata: PDFMetadata,
    tier: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const PAGE_W       = doc.page.width;                            // 595.28
        const PAGE_H       = doc.page.height;                           // 841.89
        const CONTENT_W    = PAGE_W - 2 * SPACING.pageMargin;
        const INNER_W      = CONTENT_W - 2 * SPACING.cardPadding - 3;  // inside left-accent cards

        // Track current section name so checkPageBreak can stamp it on continuation pages
        let currentSection = '';

        // ── HELPERS ──────────────────────────────────────────────────────────────

        /** Thin top rule + brand left / section name right */
        const drawHeader = (sectionName: string): void => {
            doc.rect(0, 0, PAGE_W, 2).fill(COLORS.brandDark2);
            doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.textPrimary)
                .text('PRAXISNOW', SPACING.pageMargin, 18, { width: CONTENT_W / 2 });
            if (sectionName) {
                doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textMuted)
                    .text(sectionName, SPACING.pageMargin, 18, { width: CONTENT_W, align: 'right' });
            }
        };

        /** Horizontal rule + page number right-aligned, 28pt from bottom */
        let pageNum = 2;
        const drawFooter = (num: number): void => {
            const ry = PAGE_H - 28;
            doc.moveTo(SPACING.pageMargin, ry)
                .lineTo(PAGE_W - SPACING.pageMargin, ry)
                .strokeColor(COLORS.borderSubtle).lineWidth(0.5).stroke();
            doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textMuted)
                .text(`${num}`, SPACING.pageMargin, ry + 6, { width: CONTENT_W, align: 'right' });
        };

        /** Add a new page with header if y would overflow */
        const checkPageBreak = (y: number, needed = 100): number => {
            if (y + needed > PAGE_H - 50) {
                doc.addPage();
                drawHeader(currentSection);
                return 80;
            }
            return y;
        };

        /** Small all-caps eyebrow label above a section title */
        const addEyebrow = (label: string, y: number): number => {
            doc.fontSize(FONT_SIZES.sectionEyebrow).font(FONTS.bold).fillColor(COLORS.textMuted)
                .text(label.toUpperCase(), SPACING.pageMargin, y);
            return y + 14;
        };

        /** Bold section title */
        const addSectionTitle = (title: string, y: number): number => {
            doc.fontSize(FONT_SIZES.sectionTitle).font(FONTS.bold).fillColor(COLORS.textPrimary)
                .text(title, SPACING.pageMargin, y);
            return y + 20;
        };

        /** Body text, returns y advanced past the block */
        const addBodyText = (text: string, y: number, opts: { color?: string; font?: string; fontSize?: number } = {}): number => {
            const str = text || '';
            doc.fontSize(opts.fontSize || FONT_SIZES.body)
                .font(opts.font || FONTS.regular)
                .fillColor(opts.color || COLORS.textPrimary)
                .text(str, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 4 });
            return y + doc.heightOfString(str, { width: CONTENT_W, lineGap: 4 }) + 8;
        };

        /**
         * Card with optional left-accent bar.
         * Returns { contentY, cardBottom } so caller can place text inside then
         * advance y to cardBottom + gap.
         */
        const drawCard = (y: number, height: number, bg: string, accentColor?: string): void => {
            doc.rect(SPACING.pageMargin, y, CONTENT_W, height).fill(bg);
            if (accentColor) {
                doc.rect(SPACING.pageMargin, y, 3, height).fill(accentColor);
            }
        };

        // ── COVER PAGE ───────────────────────────────────────────────────────────
        {
            const grad = doc.linearGradient(0, 0, 0, PAGE_H);
            grad.stop(0, COLORS.brandDark1).stop(1, COLORS.brandDark2);
            doc.rect(0, 0, PAGE_W, PAGE_H).fill(grad);

            // Eyebrow
            doc.fontSize(FONT_SIZES.sectionEyebrow).font(FONTS.bold)
                .fillColor('rgba(255,255,255,0.4)')
                .text('INTERVIEW ASSESSMENT REPORT', SPACING.pageMargin, 200);

            // Role title
            doc.fontSize(FONT_SIZES.coverTitle).font(FONTS.bold).fillColor('#ffffff')
                .text(metadata.role, SPACING.pageMargin, 218, { lineGap: 4 });

            // Level + scenario sub-line
            const subY = 218 + FONT_SIZES.coverTitle + 14;
            doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor('rgba(255,255,255,0.6)')
                .text(`${metadata.level}  |  ${metadata.scenario}`, SPACING.pageMargin, subY);

            // Date
            doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor('rgba(255,255,255,0.35)')
                .text(metadata.date, SPACING.pageMargin, PAGE_H - 80);

            // Session ID
            doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor('rgba(255,255,255,0.2)')
                .text(`Session ${metadata.session_id.slice(0, 8)}`, SPACING.pageMargin, PAGE_H - 64);
        }

        // ── PAGE 2: TMAY + HIGH-LEVEL ASSESSMENT ─────────────────────────────────
        doc.addPage();
        currentSection = 'High-Level Assessment';
        drawHeader(currentSection);
        let y = 56;

        // TMAY ANALYSIS
        if (evaluation.tmay_analysis) {
            y = addEyebrow('Tell Me About Yourself', y);
            y = addSectionTitle('Opening Statement', y);

            // Critique card
            {
                const critiqueText: string = evaluation.tmay_analysis.critique || '';
                const innerH = doc.heightOfString(critiqueText, { width: INNER_W + 3, lineGap: 4 });
                const cardH  = innerH + 2 * SPACING.cardPadding;
                y = checkPageBreak(y, cardH + 10);
                drawCard(y, cardH, COLORS.backgroundCard);
                doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(critiqueText, SPACING.pageMargin + SPACING.cardPadding, y + SPACING.cardPadding,
                        { width: CONTENT_W - 2 * SPACING.cardPadding, lineGap: 4 });
                y += cardH + SPACING.sectionGap;
            }

            // Model answer card (green accent)
            {
                const rewriteText: string = evaluation.tmay_analysis.rewrite || '';
                const labelH  = FONT_SIZES.small + 8;
                const bodyH   = doc.heightOfString(rewriteText, { width: INNER_W, lineGap: 4 });
                const cardH   = labelH + bodyH + 2 * SPACING.cardPadding;
                y = checkPageBreak(y, cardH + 10);
                drawCard(y, cardH, COLORS.successLight, COLORS.success);
                const innerX = SPACING.pageMargin + SPACING.cardPadding + 3;
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.success)
                    .text('MODEL ANSWER', innerX, y + SPACING.cardPadding);
                doc.fontSize(FONT_SIZES.body).font(FONTS.italic).fillColor(COLORS.textPrimary)
                    .text(rewriteText, innerX, y + SPACING.cardPadding + labelH, { width: INNER_W, lineGap: 4 });
                y += cardH + SPACING.sectionGap;
            }
        }

        y = checkPageBreak(y, 200);

        // HIGH-LEVEL ASSESSMENT
        if (evaluation.high_level_assessment) {
            y = addEyebrow('Assessment', y);
            y = addSectionTitle('High-Level Assessment', y);

            // Hiring signal badge pill
            if (evaluation.hiring_signal) {
                type SigEntry = { label: string; bg: string; fg: string };
                const signalMap: Record<string, SigEntry> = {
                    'STRONG_HIRE': { label: 'STRONG HIRE',  bg: COLORS.successLight, fg: COLORS.success },
                    'HIRE':        { label: 'HIRE',          bg: COLORS.successLight, fg: COLORS.success },
                    'BORDERLINE':  { label: 'BORDERLINE',    bg: COLORS.warningLight, fg: COLORS.warning },
                    'NO_HIRE':     { label: 'NO HIRE',       bg: COLORS.dangerLight,  fg: COLORS.danger  },
                };
                const sig = signalMap[evaluation.hiring_signal] || signalMap['BORDERLINE'];
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold);
                const badgeW = doc.widthOfString(sig.label) + 20;
                doc.rect(SPACING.pageMargin, y, badgeW, 20).fill(sig.bg);
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(sig.fg)
                    .text(sig.label, SPACING.pageMargin + 10, y + 5);
                y += 28;

                if (evaluation.hireable_level) {
                    doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textSecondary)
                        .text(`Demonstrated Level: ${evaluation.hireable_level}`, SPACING.pageMargin, y);
                    y += 20;
                }
            }

            const hla = evaluation.high_level_assessment;

            if (hla.seniority_observation) {
                y = checkPageBreak(y, 60);
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text('SENIORITY OBSERVATION', SPACING.pageMargin, y);
                y += 13;
                y = addBodyText(hla.seniority_observation, y);
                y += 4;
            }

            if (hla.strongest_signals) {
                y = checkPageBreak(y, 60);
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text('STRONGEST SIGNAL', SPACING.pageMargin, y);
                y += 13;
                y = addBodyText(hla.strongest_signals, y);
                y += 4;
            }

            if (hla.barriers_to_next_level) {
                y = checkPageBreak(y, 60);
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text('PRIMARY BARRIER TO NEXT LEVEL', SPACING.pageMargin, y);
                y += 13;
                y = addBodyText(hla.barriers_to_next_level, y);
            }
        }

        drawFooter(pageNum++);

        // ── PAGE 3: PERFORMANCE SCORECARD ────────────────────────────────────────
        doc.addPage();
        currentSection = 'Performance Scorecard';
        drawHeader(currentSection);
        y = 56;

        {
            type DimensionScore = {
                dimension: string;
                score: number;
                band: string;
                weight: number;
                weighted_score: number;
                evidence: string;
                gap: string | null;
            };
            type Competency = {
                name: string;
                score: number;
                evidence: string;
                gap: string | null;
            };

            const competencies    = evaluation.competencies    as Competency[]    | undefined;
            const dimensionScores = evaluation.dimension_scores as DimensionScore[] | undefined;

            const bandColor: Record<string, string> = {
                'Strong Hire':    COLORS.success,
                'Lean Hire':      COLORS.amber,
                'Lean No Hire':   COLORS.warning,
                'Strong No Hire': COLORS.danger,
            };

            const scoreBarColor5 = (s: number): string => {
                if (s >= 4.5) return COLORS.success;
                if (s >= 3.5) return COLORS.amber;
                if (s >= 2.5) return COLORS.warning;
                return COLORS.danger;
            };

            // ── New pipeline: competencies (1-5 scale) ────────────────────────────
            if (competencies && competencies.length > 0) {
                y = addEyebrow('Round Performance', y);
                y = addSectionTitle('Performance Scorecard', y);

                const overallScore   = evaluation.overall_score  as number | undefined;
                const recommendation = evaluation.recommendation as string | undefined;

                if (overallScore !== undefined) {
                    const recHex = recommendation ? (bandColor[recommendation] || COLORS.textSecondary) : COLORS.textSecondary;
                    const compositeStr = recommendation
                        ? `Overall  ${overallScore.toFixed(1)} / 5.0  -  ${recommendation}`
                        : `Overall  ${overallScore.toFixed(1)} / 5.0`;
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(recHex)
                        .text(compositeStr, SPACING.pageMargin, y);
                    y += 24;
                }

                competencies.forEach((c: Competency, idx: number) => {
                    y = checkPageBreak(y, 90);

                    // Name left, score right
                    const scoreStr = `${c.score.toFixed(1)} / 5`;
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(COLORS.textPrimary)
                        .text(c.name, SPACING.pageMargin, y, { width: CONTENT_W - 60 });
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(scoreBarColor5(c.score))
                        .text(scoreStr, SPACING.pageMargin, y, { width: CONTENT_W, align: 'right' });
                    y += 17;

                    // Progress bar
                    doc.rect(SPACING.pageMargin, y, CONTENT_W, 5).fill('#E5E5E5');
                    const filledW = Math.round(CONTENT_W * (c.score / 5));
                    if (filledW > 0) doc.rect(SPACING.pageMargin, y, filledW, 5).fill(scoreBarColor5(c.score));
                    y += 9;

                    if (c.evidence) {
                        y = checkPageBreak(y, 36);
                        const evStr = `Evidence: ${c.evidence}`;
                        doc.fontSize(FONT_SIZES.small).font(FONTS.italic).fillColor(COLORS.textSecondary)
                            .text(evStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                        y += doc.heightOfString(evStr, { width: CONTENT_W, lineGap: 3 }) + 3;
                    }

                    if (c.gap) {
                        y = checkPageBreak(y, 36);
                        const gapStr = `Gap: ${c.gap}`;
                        doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textMuted)
                            .text(gapStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                        y += doc.heightOfString(gapStr, { width: CONTENT_W, lineGap: 3 }) + 3;
                    }

                    y += idx < competencies.length - 1 ? 14 : 20;
                });

            // ── Legacy fallback: dimension_scores (1-4 scale) ─────────────────────
            } else if (dimensionScores && dimensionScores.length > 0) {
                y = addEyebrow('Round Performance', y);
                y = addSectionTitle('Performance Scorecard', y);

                const weightedComposite = evaluation.weighted_composite as number | undefined;
                const hireBand          = evaluation.hire_band          as string | undefined;

                if (weightedComposite !== undefined) {
                    const bandHex = hireBand ? (bandColor[hireBand] || COLORS.textSecondary) : COLORS.textSecondary;
                    const compositeStr = hireBand
                        ? `Overall  ${weightedComposite.toFixed(1)} / 4.0  -  ${hireBand}`
                        : `Overall  ${weightedComposite.toFixed(1)} / 4.0`;
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(bandHex)
                        .text(compositeStr, SPACING.pageMargin, y);
                    y += 24;
                }

                const scoreBarColor4 = (s: number): string => {
                    if (s >= 4) return COLORS.success;
                    if (s >= 3) return COLORS.amber;
                    if (s >= 2) return COLORS.warning;
                    return COLORS.danger;
                };

                dimensionScores.forEach((ds: DimensionScore, idx: number) => {
                    y = checkPageBreak(y, 90);

                    const dimHex = bandColor[ds.band] || COLORS.textSecondary;
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(COLORS.textPrimary)
                        .text(ds.dimension, SPACING.pageMargin, y, { width: CONTENT_W - 100 });
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(dimHex)
                        .text(`${ds.score} / 4  (${ds.band})`, SPACING.pageMargin, y, { width: CONTENT_W, align: 'right' });
                    y += 17;

                    doc.rect(SPACING.pageMargin, y, CONTENT_W, 5).fill('#E5E5E5');
                    const filledW = Math.round(CONTENT_W * (ds.score / 4));
                    if (filledW > 0) doc.rect(SPACING.pageMargin, y, filledW, 5).fill(scoreBarColor4(ds.score));
                    y += 9;

                    if (ds.evidence) {
                        y = checkPageBreak(y, 36);
                        const evStr = `Evidence: ${ds.evidence}`;
                        doc.fontSize(FONT_SIZES.small).font(FONTS.italic).fillColor(COLORS.textSecondary)
                            .text(evStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                        y += doc.heightOfString(evStr, { width: CONTENT_W, lineGap: 3 }) + 3;
                    }

                    if (ds.gap) {
                        y = checkPageBreak(y, 36);
                        const gapStr = `Gap: ${ds.gap}`;
                        doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textMuted)
                            .text(gapStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                        y += doc.heightOfString(gapStr, { width: CONTENT_W, lineGap: 3 }) + 3;
                    }

                    y += idx < dimensionScores.length - 1 ? 14 : 20;
                });
            }
        }

        // Dimensions assessed (two-column list)
        if (metadata.dimension_order && metadata.dimension_order.length > 0) {
            y = checkPageBreak(y, 60);
            y = addEyebrow('Scope', y);
            y = addSectionTitle('Dimensions Assessed', y);

            const dims   = metadata.dimension_order;
            const mid    = Math.ceil(dims.length / 2);
            const left   = dims.slice(0, mid);
            const right  = dims.slice(mid);
            const colW   = CONTENT_W / 2;
            const startY = y;

            left.forEach((dim: string) => {
                doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(`- ${dim}`, SPACING.pageMargin, y, { width: colW });
                y += 16;
            });
            y = startY;
            right.forEach((dim: string) => {
                doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(`- ${dim}`, SPACING.pageMargin + colW, y, { width: colW });
                y += 16;
            });
            y = startY + Math.max(left.length, right.length) * 16 + SPACING.sectionGap;
        }

        drawFooter(pageNum++);

        // ── STRENGTHS & AREAS FOR IMPROVEMENT ────────────────────────────────────
        {
            let onNewPage = false;

            const ensurePage = (): void => {
                if (!onNewPage) {
                    doc.addPage();
                    currentSection = 'Strengths & Areas for Improvement';
                    drawHeader(currentSection);
                    y = 56;
                    onNewPage = true;
                }
            };

            // STRENGTHS
            const hasStrengths = evaluation.strengths && Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0;
            if (hasStrengths) {
                ensurePage();
                y = addEyebrow('Positive Signals', y);
                y = addSectionTitle('Core Strengths', y);

                evaluation.strengths.forEach((s: any) => {
                    const skillText: string = s.skill ?? '';
                    if (!skillText) return;

                    y = checkPageBreak(y, 32);

                    // Pill badge
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold);
                    const pillText = `+ ${skillText}`;
                    const pillW    = doc.widthOfString(pillText) + 24;
                    doc.rect(SPACING.pageMargin, y, pillW, 22).fill(COLORS.successLight);
                    doc.rect(SPACING.pageMargin, y, 3, 22).fill(COLORS.success);
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(COLORS.success)
                        .text(pillText, SPACING.pageMargin + SPACING.cardPadding, y + 5);
                    y += 30;
                });
                y += SPACING.sectionGap;
            }

            // AREAS FOR IMPROVEMENT
            const hasImprovements = evaluation.areas_for_improvement && Array.isArray(evaluation.areas_for_improvement) && evaluation.areas_for_improvement.length > 0;
            if (hasImprovements) {
                ensurePage();
                if (hasStrengths) y = checkPageBreak(y, 140);

                y = addEyebrow('Development Areas', y);
                y = addSectionTitle('Areas for Improvement', y);

                // Level-progression framing
                const levelProgression: Record<string, string> = {
                    'Junior':    'Mid-level',
                    'Mid-level': 'Senior',
                    'Senior':    'Principal',
                    'Principal': 'Staff',
                    'Staff':     'Director',
                };
                let nextLevelLabel = 'To strengthen your bar:';
                try {
                    const hireableLevel: string = evaluation.hireable_level || '';
                    const tokens  = hireableLevel.split(' ');
                    const matched = tokens.find((t: string) => Object.prototype.hasOwnProperty.call(levelProgression, t));
                    if (matched) nextLevelLabel = `To perform at ${levelProgression[matched]} ${metadata.role} bar:`;
                } catch {
                    nextLevelLabel = 'To strengthen your bar:';
                }

                doc.fontSize(FONT_SIZES.small).font(FONTS.italic).fillColor(COLORS.textMuted)
                    .text(nextLevelLabel, SPACING.pageMargin, y);
                y += 18;

                evaluation.areas_for_improvement.forEach((imp: any) => {
                    const isString    = typeof imp === 'string';
                    const headingText: string = isString ? imp : (imp.limit ?? '');
                    if (!headingText) { y += 8; return; }

                    // Card colour based on gap_type
                    let cardBg = COLORS.warningLight;
                    let barCol = COLORS.warning;
                    if (!isString && imp.gap_type) {
                        if (imp.gap_type === 'fundamental' || imp.gap_type === 'role_level') {
                            cardBg = COLORS.dangerLight;
                            barCol = COLORS.danger;
                        } else if (imp.gap_type === 'polish') {
                            cardBg = COLORS.backgroundCard;
                            barCol = COLORS.amber;
                        }
                    }

                    const whyText: string = isString ? '' : (imp.why_it_matters ?? '');
                    const headH = doc.heightOfString(headingText, { width: INNER_W, lineGap: 3 });
                    const whyH  = whyText
                        ? doc.heightOfString(`To reach the next level: ${whyText}`, { width: INNER_W, lineGap: 3 }) + 10
                        : 0;
                    const cardH = SPACING.cardPadding + headH + whyH + SPACING.cardPadding;

                    y = checkPageBreak(y, cardH + 10);
                    drawCard(y, cardH, cardBg, barCol);

                    const innerX = SPACING.pageMargin + SPACING.cardPadding + 3;
                    let cy = y + SPACING.cardPadding;

                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(COLORS.textPrimary)
                        .text(headingText, innerX, cy, { width: INNER_W, lineGap: 3 });
                    cy += headH;

                    if (whyText) {
                        cy += 8;
                        doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textSecondary)
                            .text(`To reach the next level: ${whyText}`, innerX, cy, { width: INNER_W, lineGap: 3 });
                    }

                    y += cardH + 10;
                });
            }

            if (onNewPage) drawFooter(pageNum++);
        }

        // ── ANSWER UPGRADES ──────────────────────────────────────────────────────
        if (evaluation.answer_upgrades && Array.isArray(evaluation.answer_upgrades) && evaluation.answer_upgrades.length > 0) {
            doc.addPage();
            currentSection = 'Answer Upgrades';
            drawHeader(currentSection);
            y = 56;

            y = addEyebrow('AI Coaching', y);
            y = addSectionTitle('Answer Upgrades', y);

            const introStr = 'The most critical answers to reconstruct, shown alongside your original response.';
            doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textSecondary)
                .text(introStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
            y += doc.heightOfString(introStr, { width: CONTENT_W, lineGap: 3 }) + SPACING.sectionGap;

            evaluation.answer_upgrades.forEach((upgrade: any, index: number) => {
                y = checkPageBreak(y, 160);

                // Question heading
                const qStr = `${index + 1}.  ${upgrade.question_context || ''}`;
                doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(COLORS.textPrimary)
                    .text(qStr, SPACING.pageMargin, y, { width: CONTENT_W });
                y += doc.heightOfString(qStr, { width: CONTENT_W }) + 10;

                // Weakness card
                const weakText: string = upgrade.weakness || '';
                if (weakText) {
                    y = checkPageBreak(y, 50);
                    const labelH = FONT_SIZES.small + 8;
                    const bodyH  = doc.heightOfString(weakText, { width: INNER_W, lineGap: 3 });
                    const cardH  = labelH + bodyH + 2 * SPACING.cardPadding;
                    drawCard(y, cardH, COLORS.dangerLight, COLORS.danger);
                    const innerX = SPACING.pageMargin + SPACING.cardPadding + 3;
                    doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.danger)
                        .text('WEAKNESS', innerX, y + SPACING.cardPadding);
                    doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                        .text(weakText, innerX, y + SPACING.cardPadding + labelH, { width: INNER_W, lineGap: 3 });
                    y += cardH + 8;
                }

                // Upgraded answer card
                const upgradeText: string = upgrade.upgraded_answer || '';
                if (upgradeText) {
                    y = checkPageBreak(y, 60);
                    const labelH  = FONT_SIZES.small + 8;
                    const bodyH   = doc.heightOfString(`"${upgradeText}"`, { width: INNER_W, lineGap: 3 });
                    const cardH   = labelH + bodyH + 2 * SPACING.cardPadding;
                    drawCard(y, cardH, COLORS.successLight, COLORS.success);
                    const innerX = SPACING.pageMargin + SPACING.cardPadding + 3;
                    doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.success)
                        .text('UPGRADED ANSWER', innerX, y + SPACING.cardPadding);
                    doc.fontSize(FONT_SIZES.body).font(FONTS.italic).fillColor(COLORS.textPrimary)
                        .text(`"${upgradeText}"`, innerX, y + SPACING.cardPadding + labelH, { width: INNER_W, lineGap: 3 });
                    y += cardH + SPACING.sectionGap;
                }
            });

            drawFooter(pageNum++);
        }

        // ── ANNOTATED TRANSCRIPT ─────────────────────────────────────────────────
        const transcriptExtracts = (evaluation as any).transcript_extracts;
        const turnDiagnostics: any[] = (evaluation as any).answer_level_diagnostics || [];

        if (transcriptExtracts && Array.isArray(transcriptExtracts) && transcriptExtracts.length > 0) {
            doc.addPage();
            currentSection = 'Your Interview';
            drawHeader(currentSection);
            y = 56;

            y = addEyebrow('Annotated Transcript', y);
            y = addSectionTitle('Your Interview', y);

            const subStr = 'Your answers alongside what the interviewer observed.';
            doc.fontSize(FONT_SIZES.small).font(FONTS.regular).fillColor(COLORS.textSecondary)
                .text(subStr, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
            y += doc.heightOfString(subStr, { width: CONTENT_W, lineGap: 3 }) + SPACING.sectionGap;

            for (const extract of transcriptExtracts) {
                const diagnostic = turnDiagnostics.find((d: any) => d.turn_index === extract.turn_index);
                const isTMAY     = extract.question_type === 'tmay' || extract.turn_index === 0;

                y = checkPageBreak(y, 120);

                // Turn label
                const qLabel = isTMAY ? 'Tell Me About Yourself' : `Question ${extract.turn_index}`;
                doc.fontSize(FONT_SIZES.sectionEyebrow).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text(qLabel.toUpperCase(), SPACING.pageMargin, y);
                y += 14;

                // Question text
                const qText: string = extract.question || '';
                doc.fontSize(FONT_SIZES.body).font(FONTS.italic).fillColor(COLORS.textSecondary)
                    .text(qText, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                y += doc.heightOfString(qText, { width: CONTENT_W, lineGap: 3 }) + 8;

                // Candidate answer card
                const answerText: string = extract.candidate_answer_verbatim || '(no answer captured)';
                const answerInnerW = CONTENT_W - 2 * SPACING.cardPadding;
                const answerBodyH  = doc.heightOfString(answerText, { width: answerInnerW, lineGap: 4 });
                const answerCardH  = answerBodyH + 2 * SPACING.cardPadding;

                y = checkPageBreak(y, answerCardH + 30);
                drawCard(y, answerCardH, COLORS.backgroundCard);
                doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(answerText, SPACING.pageMargin + SPACING.cardPadding, y + SPACING.cardPadding,
                        { width: answerInnerW, lineGap: 4 });
                y += answerCardH + 6;

                // Signal annotation
                if (diagnostic) {
                    const sigStrength: string = diagnostic.signal_strength || '';
                    const sigColor = sigStrength === 'strong' ? COLORS.success
                        : sigStrength === 'mixed' ? COLORS.amber : COLORS.danger;
                    const sigLabel = sigStrength === 'strong' ? 'Strong Signal'
                        : sigStrength === 'mixed' ? 'Mixed Signal' : 'Weak Signal';
                    const consequence: string = diagnostic.interviewer_consequence || diagnostic.impact_on_interviewer || '';
                    const annotText = consequence ? `${sigLabel}  -  ${consequence}` : sigLabel;
                    doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(sigColor)
                        .text(annotText, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
                    y += doc.heightOfString(annotText, { width: CONTENT_W, lineGap: 3 }) + 14;
                } else {
                    y += 12;
                }

                // Separator
                doc.moveTo(SPACING.pageMargin, y)
                    .lineTo(PAGE_W - SPACING.pageMargin, y)
                    .strokeColor(COLORS.borderSubtle).lineWidth(0.5).stroke();
                y += 14;
            }

            drawFooter(pageNum++);
        }

        // ── PERSONAL ANSWER RULES ────────────────────────────────────────────────
        // isExtendedEval matches the same gate used in eval-logic.ts (Pro+ merged into Pro, Feb 2026)
        const isExtendedEval = tier === 'Pro' || tier === 'Pro+';
        if (isExtendedEval && evaluation.personal_answer_rules && Array.isArray(evaluation.personal_answer_rules) && evaluation.personal_answer_rules.length > 0) {
            doc.addPage();
            currentSection = 'Personal Answer Rules';
            drawHeader(currentSection);
            y = 56;

            y = addEyebrow('Personalized Coaching', y);
            y = addSectionTitle('Your Personal Answer Rules', y);

            const rulesIntro = 'Rules calibrated to your specific interview patterns. Apply these every time you answer.';
            doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textSecondary)
                .text(rulesIntro, SPACING.pageMargin, y, { width: CONTENT_W, lineGap: 3 });
            y += doc.heightOfString(rulesIntro, { width: CONTENT_W, lineGap: 3 }) + SPACING.sectionGap;

            evaluation.personal_answer_rules.forEach((rule: string, index: number) => {
                const ruleStr = rule || '';
                const labelH  = FONT_SIZES.small + 8;
                const bodyH   = doc.heightOfString(ruleStr, { width: INNER_W, lineGap: 3 });
                const cardH   = labelH + bodyH + 2 * SPACING.cardPadding;

                y = checkPageBreak(y, cardH + 12);
                drawCard(y, cardH, COLORS.backgroundCard, COLORS.brandDark2);

                const innerX = SPACING.pageMargin + SPACING.cardPadding + 3;
                doc.fontSize(FONT_SIZES.small).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text(`RULE ${index + 1}`, innerX, y + SPACING.cardPadding);
                doc.fontSize(FONT_SIZES.body).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(ruleStr, innerX, y + SPACING.cardPadding + labelH, { width: INNER_W, lineGap: 3 });

                y += cardH + 12;
            });

            drawFooter(pageNum++);
        }

        // ── END ──────────────────────────────────────────────────────────────────
        doc.end();
    });
}
