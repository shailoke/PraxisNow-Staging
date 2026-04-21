import PDFDocument from 'pdfkit';

/**
 * PraxisNow PDF Report Generator v2 (Interviewer-Calibrated)
 * Renders the corrective feedback report directly from the evaluator output.
 * 
 * SCHEMA:
 * 1. tmay_analysis
 * 2. high_level_assessment
 * 3. strengths
 * 4. areas_for_improvement
 * 5. answer_upgrades
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

// ========================================================================
// DESIGN TOKENS
// ========================================================================
const COLORS = {
    textPrimary: '#030213',
    textSecondary: '#5e5e6d',
    textMuted: '#7a6991',
    backgroundPage: '#ffffff',
    borderSubtle: 'rgba(0,0,0,0.1)',
    brandDark1: '#0a0514',
    brandDark2: '#1a0f2e',
    brandDark3: '#0f0820',
    primary: '#7a6991',
    accent: '#7a6991',
    success: '#2e7d32',
    warning: '#d32f2f'
};

const FONTS = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique'
};

const FONT_SIZES = {
    coverTitle: 42,
    sectionTitle: 22,
    subsectionTitle: 14,
    body: 12,
    metaLabel: 10
};

const SPACING = {
    pageMargin: 72,
    sectionGap: 30,
    cardPadding: 20
};

export async function generateSessionPDF(
    evaluation: any,
    metadata: PDFMetadata,
    tier: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 0,
            bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- HELPERS ---
        const drawHeader = () => {
            const width = doc.page.width;
            doc.rect(0, 0, width, 4).fill(COLORS.brandDark2);
            doc.fontSize(9).fillColor(COLORS.textSecondary).font(FONTS.regular)
                .text('PRAXISNOW // INTERVIEWER CALIBRATION', SPACING.pageMargin, 35);
        };

        const drawFooter = () => {
            const width = doc.page.width;
            const height = doc.page.height;
            const bottom = height - 50;

            doc.moveTo(SPACING.pageMargin, bottom - 20)
                .lineTo(width - SPACING.pageMargin, bottom - 20)
                .strokeColor(COLORS.borderSubtle).lineWidth(1).stroke();

            doc.fontSize(8).fillColor(COLORS.textMuted)
                .text('CONFIDENTIAL - PERSONAL PRACTICE ASSESSMENT', SPACING.pageMargin, bottom);
        };

        const addSectionTitle = (title: string, y: number) => {
            doc.fontSize(FONT_SIZES.sectionTitle).font(FONTS.bold).fillColor(COLORS.textPrimary)
                .text(title, SPACING.pageMargin, y);
            return y + 35;
        };

        const addSubsection = (title: string, y: number) => {
            doc.fontSize(FONT_SIZES.subsectionTitle).font(FONTS.bold).fillColor(COLORS.textPrimary)
                .text(title.toUpperCase(), SPACING.pageMargin, y);
            return y + 20;
        };

        const addBodyText = (text: string, y: number, options: any = {}) => {
            const width = options.width || doc.page.width - (2 * SPACING.pageMargin);
            doc.fontSize(options.fontSize || FONT_SIZES.body)
                .font(options.font || FONTS.regular)
                .fillColor(options.color || COLORS.textPrimary)
                .text(text || '', SPACING.pageMargin, y, { width, lineGap: 6 });
            return y + doc.heightOfString(text || '', { width, lineGap: 6 }) + 10;
        };

        const checkPageBreak = (y: number, needed: number = 100) => {
            if (y + needed > doc.page.height - 50) {
                doc.addPage();
                drawHeader();
                return 80;
            }
            return y;
        };

        // --- PAGE 1: COVER ---
        const width = doc.page.width;
        const height = doc.page.height;
        const gradient = doc.linearGradient(0, 0, width, height);
        gradient.stop(0, COLORS.brandDark1).stop(1, COLORS.brandDark2);
        doc.rect(0, 0, width, height).fill(gradient);

        doc.fontSize(36).font(FONTS.bold).fillColor('#fff')
            .text('Interviewer Calibration', SPACING.pageMargin, 200);

        doc.fontSize(14).font(FONTS.regular).fillColor('#ccc')
            .text(`${metadata.role} (${metadata.level})`, SPACING.pageMargin, 250);

        doc.fontSize(12).text(metadata.date, SPACING.pageMargin, 275);

        doc.fontSize(10).text(`Session ID: ${metadata.session_id.slice(0, 8)}`, SPACING.pageMargin, height - 50);


        // --- PAGE 2: TMAY & HIGH LEVEL ---
        doc.addPage();
        drawHeader();
        let y = 80;

        // 1. TMAY ANALYSIS
        if (evaluation.tmay_analysis) {
            y = addSectionTitle('Tell Me About Yourself', y);

            // Critique
            y = addSubsection('Interviewer Critique', y);
            y = addBodyText(evaluation.tmay_analysis.critique, y);
            y += 10;

            // Rewrite Box
            y = checkPageBreak(y, 200);

            // Draw Box Background
            doc.rect(SPACING.pageMargin, y, width - (2 * SPACING.pageMargin), 4)
                .fill(COLORS.accent); // Top bar

            y += 10; // Padding inside box visually (no real box rect yet, just spacing)

            doc.fontSize(10).font(FONTS.bold).fillColor(COLORS.accent)
                .text('INTERVIEWER REWRITE (IDEAL VERSION)', SPACING.pageMargin, y);
            y += 20;

            // Render Rewrite Text
            doc.font(FONTS.italic).fillColor(COLORS.textPrimary);
            y = addBodyText(evaluation.tmay_analysis.rewrite, y);
            doc.font(FONTS.regular); // Reset

            y += 20;
        }

        y = checkPageBreak(y, 250);

        // 2. HIGH-LEVEL ASSESSMENT
        if (evaluation.high_level_assessment) {
            y = addSectionTitle('High-Level Assessment', y);

            // Hiring Signal Badge
            if (evaluation.hiring_signal) {
                const signalMap: any = {
                    'STRONG_HIRE': { label: 'STRONG HIRE', color: '#2e7d32' },
                    'HIRE': { label: 'HIRE', color: '#2e7d32' },
                    'BORDERLINE': { label: 'BORDERLINE', color: '#d32f2f' },
                    'NO_HIRE': { label: 'NO HIRE', color: '#d32f2f' }
                };
                const signal = signalMap[evaluation.hiring_signal] || signalMap['BORDERLINE'];

                doc.fontSize(14).font(FONTS.bold).fillColor(signal.color)
                    .text(signal.label, SPACING.pageMargin, y);
                y += 25;

                // Hireable Level
                if (evaluation.hireable_level) {
                    doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textSecondary)
                        .text(`Demonstrated Level: ${evaluation.hireable_level}`, SPACING.pageMargin, y);
                    y += 25;
                }
            }

            const hla = evaluation.high_level_assessment;

            y = addSubsection('Seniority Observation', y);
            y = addBodyText(hla.seniority_observation, y);
            y += 10;

            y = addSubsection('Strongest Signal', y);
            y = addBodyText(hla.strongest_signals, y);
            y += 10;

            y = addSubsection('Primary Barrier to Next Level', y);
            y = addBodyText(hla.barriers_to_next_level, y);
            y += 20;
        }

        drawFooter(); // Page 2 Footer

        // --- PAGE 3: STRENGTHS & IMPROVEMENTS ---
        doc.addPage();
        drawHeader();
        y = 80;

        // --- PERFORMANCE SCORECARD ---
        {
            type DimensionScore = {
                dimension: string
                score: number
                band: string
                weight: number
                weighted_score: number
                evidence: string
                gap: string | null
            }
            type Competency = {
                name: string
                score: number   // 1-5
                evidence: string
                gap: string | null
            }

            const competencies = evaluation.competencies as Competency[] | undefined
            const dimensionScores = evaluation.dimension_scores as DimensionScore[] | undefined
            const contentWidth = width - (2 * SPACING.pageMargin)

            const scorecardBandColor: Record<string, string> = {
                'Strong Hire':    '#16a34a',
                'Lean Hire':      '#ca8a04',
                'Lean No Hire':   '#ea580c',
                'Strong No Hire': '#dc2626',
            }

            // ── New pipeline: competencies (1-5 scale) ─────────────────────────
            if (competencies && competencies.length > 0) {
                y = checkPageBreak(y, 80)
                y = addSectionTitle('Performance Scorecard', y)

                const overallScore = evaluation.overall_score as number | undefined
                const recommendation = evaluation.recommendation as string | undefined

                if (overallScore !== undefined) {
                    const recHex = recommendation ? (scorecardBandColor[recommendation] || COLORS.textSecondary) : COLORS.textSecondary
                    const compositeText = recommendation
                        ? `Overall: ${overallScore.toFixed(1)} / 5.0 — ${recommendation}`
                        : `Overall: ${overallScore.toFixed(1)} / 5.0`
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(recHex)
                        .text(compositeText, SPACING.pageMargin, y)
                    y += 22
                }

                const scoreBarColor5 = (score: number): string => {
                    if (score >= 4.5) return '#16a34a'
                    if (score >= 3.5) return '#ca8a04'
                    if (score >= 2.5) return '#ea580c'
                    return '#dc2626'
                }

                competencies.forEach((c: Competency, idx: number) => {
                    y = checkPageBreak(y, 120)

                    // Competency name + score on one line
                    const dimLabel = `${c.name}  ${c.score.toFixed(1)} / 5`
                    doc.fontSize(FONT_SIZES.subsectionTitle).font(FONTS.bold).fillColor(COLORS.textPrimary)
                        .text(dimLabel, SPACING.pageMargin, y, { width: contentWidth })
                    y += 20

                    // Score bar — background then fill (score / 5)
                    doc.rect(SPACING.pageMargin, y, contentWidth, 6).fill('#E5E5E5')
                    const filledWidth = Math.round(contentWidth * (c.score / 5))
                    if (filledWidth > 0) {
                        doc.rect(SPACING.pageMargin, y, filledWidth, 6).fill(scoreBarColor5(c.score))
                    }
                    y += 10

                    // Evidence
                    if (c.evidence) {
                        y = checkPageBreak(y, 40)
                        const evidenceText = `Evidence: ${c.evidence}`
                        doc.fontSize(FONT_SIZES.body - 2).font(FONTS.italic).fillColor(COLORS.textSecondary)
                            .text(evidenceText, SPACING.pageMargin, y, { width: contentWidth })
                        y += doc.heightOfString(evidenceText, { width: contentWidth }) + 4
                    }

                    // Gap note
                    if (c.gap) {
                        y = checkPageBreak(y, 40)
                        const gapText = `Gap: ${c.gap}`
                        doc.fontSize(FONT_SIZES.body - 2).font(FONTS.regular).fillColor(COLORS.textMuted)
                            .text(gapText, SPACING.pageMargin, y, { width: contentWidth })
                        y += doc.heightOfString(gapText, { width: contentWidth }) + 4
                    }

                    y += idx < competencies.length - 1 ? 10 : 20
                })

            // ── Legacy fallback: dimension_scores (1-4 scale) ──────────────────
            } else if (dimensionScores && dimensionScores.length > 0) {
                y = checkPageBreak(y, 80)
                y = addSectionTitle('Performance Scorecard', y)

                const weightedComposite = evaluation.weighted_composite as number | undefined
                const hireBand = evaluation.hire_band as string | undefined

                if (weightedComposite !== undefined) {
                    const bandHex = hireBand ? (scorecardBandColor[hireBand] || COLORS.textSecondary) : COLORS.textSecondary
                    const compositeText = hireBand
                        ? `Overall: ${weightedComposite.toFixed(1)} / 4.0 — ${hireBand}`
                        : `Overall: ${weightedComposite.toFixed(1)} / 4.0`
                    doc.fontSize(FONT_SIZES.body).font(FONTS.bold).fillColor(bandHex)
                        .text(compositeText, SPACING.pageMargin, y)
                    y += 22
                }

                const scoreBarColor = (score: number): string => {
                    if (score >= 4) return '#16a34a'
                    if (score >= 3) return '#ca8a04'
                    if (score >= 2) return '#ea580c'
                    return '#dc2626'
                }

                dimensionScores.forEach((ds: DimensionScore, idx: number) => {
                    y = checkPageBreak(y, 120)

                    const dimBandHex = scorecardBandColor[ds.band] || COLORS.textSecondary
                    const dimLabel = `${ds.dimension}  ${ds.score} / 4  (${ds.band})`
                    doc.fontSize(FONT_SIZES.subsectionTitle).font(FONTS.bold).fillColor(dimBandHex)
                        .text(dimLabel, SPACING.pageMargin, y, { width: contentWidth })
                    y += 20

                    doc.rect(SPACING.pageMargin, y, contentWidth, 6).fill('#E5E5E5')
                    const filledWidth = Math.round(contentWidth * (ds.score / 4))
                    if (filledWidth > 0) {
                        doc.rect(SPACING.pageMargin, y, filledWidth, 6).fill(scoreBarColor(ds.score))
                    }
                    y += 10

                    if (ds.evidence) {
                        y = checkPageBreak(y, 40)
                        const evidenceText = `Evidence: ${ds.evidence}`
                        doc.fontSize(FONT_SIZES.body - 2).font(FONTS.italic).fillColor(COLORS.textSecondary)
                            .text(evidenceText, SPACING.pageMargin, y, { width: contentWidth })
                        y += doc.heightOfString(evidenceText, { width: contentWidth }) + 4
                    }

                    if (ds.gap) {
                        y = checkPageBreak(y, 40)
                        const gapText = `Gap: ${ds.gap}`
                        doc.fontSize(FONT_SIZES.body - 2).font(FONTS.regular).fillColor(COLORS.textMuted)
                            .text(gapText, SPACING.pageMargin, y, { width: contentWidth })
                        y += doc.heightOfString(gapText, { width: contentWidth }) + 4
                    }

                    y += idx < dimensionScores.length - 1 ? 10 : 20
                })
            }
        }

        // --- DIMENSIONS ASSESSED ---
        if (metadata.dimension_order && metadata.dimension_order.length > 0) {
            y = checkPageBreak(y, 60)
            y = addSectionTitle('Dimensions Assessed in This Session', y)
            const dims = metadata.dimension_order
            const midpoint = Math.ceil(dims.length / 2)
            const leftCol = dims.slice(0, midpoint)
            const rightCol = dims.slice(midpoint)
            const colWidth = (width - (2 * SPACING.pageMargin)) / 2
            const startY = y

            // Left column
            leftCol.forEach((dim: string) => {
                doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(`- ${dim}`, SPACING.pageMargin, y, { width: colWidth })
                y += 18
            })

            // Right column — reset y to startY, offset x by colWidth
            y = startY
            rightCol.forEach((dim: string) => {
                doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(`- ${dim}`, SPACING.pageMargin + colWidth, y, { width: colWidth })
                y += 18
            })

            // Advance y past whichever column was longer
            y = startY + (Math.max(leftCol.length, rightCol.length) * 18) + 20
        }

        // 3. STRENGTHS
        if (evaluation.strengths && Array.isArray(evaluation.strengths)) {
            y = addSectionTitle('Core Strengths', y);

            evaluation.strengths.forEach((s: any) => {
                y = checkPageBreak(y, 60);

                const skillText: string = s.skill ?? '';
                if (!skillText) { y += 20; return; }

                doc.fontSize(12).font(FONTS.bold).fillColor(COLORS.success)
                    .text(`PASS  ${skillText}`, SPACING.pageMargin, y);
                y += 24;
            });
            y += 10;
        }

        // 4. AREAS FOR IMPROVEMENT
        if (evaluation.areas_for_improvement && Array.isArray(evaluation.areas_for_improvement)) {
            y = checkPageBreak(y, 200);
            y = addSectionTitle('Areas for Improvement', y);

            // ── Level-unlock reframe (Change 4) ──────────────────────────────────
            // Derive nextLevelLabel from hireable_level so improvements read as
            // forward-looking (what gets you promoted) rather than deficit-focused.
            const levelProgression: Record<string, string> = {
                'Junior': 'Mid-level',
                'Mid-level': 'Senior',
                'Senior': 'Principal',
                'Principal': 'Staff',
                'Staff': 'Director',
            };
            let nextLevelLabel = 'To strengthen your bar:';
            try {
                const hireableLevel: string = evaluation.hireable_level || '';
                const tokens = hireableLevel.split(' ');
                const matchedToken = tokens.find(
                    (t: string) => Object.prototype.hasOwnProperty.call(levelProgression, t)
                );
                if (matchedToken) {
                    const nextLevel = levelProgression[matchedToken];
                    nextLevelLabel = `To perform at ${nextLevel} ${metadata.role} bar:`;
                }
            } catch (levelErr) {
                console.warn('[PDF] Level progression parse failed, using fallback:', levelErr);
                nextLevelLabel = 'To strengthen your bar:';
            }
            // ─────────────────────────────────────────────────────────────────────

            evaluation.areas_for_improvement.forEach((imp: any, impIndex: number) => {
                y = checkPageBreak(y, 100);

                // Render nextLevelLabel once, in gray italic, above the first item only
                if (impIndex === 0) {
                    y = checkPageBreak(y, 20);
                    doc.fontSize(9).font(FONTS.italic).fillColor(COLORS.textMuted)
                        .text(nextLevelLabel, SPACING.pageMargin, y);
                    y += 18;
                }

                // Support both new pipeline (string) and old pipeline (object) formats
                const isString = typeof imp === 'string';
                const headingText: string = isString ? imp : (imp.limit ?? '');
                if (!headingText) { y += 10; return; }

                // Gap Type Badge (object format only)
                let gapBadge = '';
                let gapColor = COLORS.warning;
                if (!isString && imp.gap_type) {
                    if (imp.gap_type === 'fundamental') {
                        gapBadge = '[FUNDAMENTAL] ';
                        gapColor = '#d32f2f';
                    } else if (imp.gap_type === 'role_level') {
                        gapBadge = '[ROLE-LEVEL] ';
                        gapColor = '#d32f2f';
                    } else if (imp.gap_type === 'polish') {
                        gapBadge = '[POLISH] ';
                        gapColor = COLORS.accent;
                    }
                }

                doc.fontSize(12).font(FONTS.bold).fillColor(gapColor)
                    .text(`${gapBadge}${headingText}`, SPACING.pageMargin, y);
                y += 20;

                // Impact Scope (object format only)
                if (!isString && imp.impact_scope) {
                    let impactText = '';
                    if (imp.impact_scope === 'blocks_hire') {
                        impactText = 'Impact: Blocks hiring at this level';
                    } else if (imp.impact_scope === 'blocks_next_level') {
                        impactText = 'Impact: Required to reach next level';
                    } else if (imp.impact_scope === 'polish_only') {
                        impactText = 'Impact: Polish-level improvement (not a hiring risk)';
                    }
                    if (impactText) {
                        doc.fontSize(9).font(FONTS.italic).fillColor(COLORS.textMuted)
                            .text(impactText, SPACING.pageMargin, y);
                        y += 15;
                    }
                }

                // why_it_matters (object format only — string items carry no subtext)
                // Data object is NOT mutated.
                const whyText: string = isString ? '' : (imp.why_it_matters ?? '');
                if (whyText) {
                    const whyItMattersText = `To reach the next level: ${whyText}`;
                    doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textPrimary)
                        .text(whyItMattersText, SPACING.pageMargin, y, { width: width - (2 * SPACING.pageMargin) });
                    y += doc.heightOfString(whyItMattersText, { width: width - (2 * SPACING.pageMargin) }) + 20;
                } else {
                    y += 10;
                }
            });
        }

        drawFooter();

        // --- PAGE 4+: ANSWER UPGRADES ---
        if (evaluation.answer_upgrades && Array.isArray(evaluation.answer_upgrades)) {
            doc.addPage();
            drawHeader();
            y = 80;

            y = addSectionTitle('Answer Upgrades', y);
            y = addBodyText('Below are the most critical answers to reconstruct. These rewrites demonstrate the difference between a "pass" and a "hire".', y);
            y += 20;

            evaluation.answer_upgrades.forEach((upgrade: any, index: number) => {
                y = checkPageBreak(y, 250); // Need substantial space for an upgrade

                // Title
                doc.fontSize(14).font(FONTS.bold).fillColor(COLORS.brandDark2)
                    .text(`${index + 1}. ${upgrade.question_context}`, SPACING.pageMargin, y);
                y += 25;

                // Weakness
                doc.fontSize(10).font(FONTS.bold).fillColor(COLORS.warning).text('WEAKNESS:', SPACING.pageMargin, y);
                doc.fontSize(10).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(upgrade.weakness, SPACING.pageMargin + 70, y, { width: width - SPACING.pageMargin - 100 });
                y += doc.heightOfString(upgrade.weakness, { width: width - SPACING.pageMargin - 100 }) + 15;

                // Upgraded Answer Box
                doc.fontSize(10).font(FONTS.bold).fillColor(COLORS.success).text('UPGRADE:', SPACING.pageMargin, y);
                y += 15;

                // Content
                doc.rect(SPACING.pageMargin, y, width - (2 * SPACING.pageMargin), 2).fill(COLORS.success); // Top line
                y += 10;

                doc.fontSize(11).font(FONTS.italic).fillColor(COLORS.textPrimary);
                const upgradeText = `"${upgrade.upgraded_answer}"`;
                doc.text(upgradeText, SPACING.pageMargin, y, { width: width - (2 * SPACING.pageMargin) });

                y += doc.heightOfString(upgradeText, { width: width - (2 * SPACING.pageMargin) }) + 30;
            });
            drawFooter();
        }

        // --- ANNOTATED TRANSCRIPT SECTION ---
        // Only renders for new sessions (Stage 1 populates transcript_extracts)
        const transcriptExtracts = (evaluation as any).transcript_extracts;
        const turnDiagnostics: any[] = (evaluation as any).answer_level_diagnostics || [];

        if (transcriptExtracts && Array.isArray(transcriptExtracts) && transcriptExtracts.length > 0) {
            doc.addPage();
            drawHeader();
            y = 80;

            doc.fontSize(FONT_SIZES.sectionTitle).font(FONTS.bold).fillColor(COLORS.textPrimary)
                .text('Your Interview — Turn by Turn', SPACING.pageMargin, y);
            y += 30;

            doc.fontSize(9).font(FONTS.regular).fillColor(COLORS.textSecondary)
                .text(
                    'Your exact answers are shown below alongside what the interviewer observed. This is the section to return to.',
                    SPACING.pageMargin, y, { width: width - 2 * SPACING.pageMargin }
                );
            y += 28;

            for (const extract of transcriptExtracts) {
                const diagnostic = turnDiagnostics.find((d: any) => d.turn_index === extract.turn_index);
                const isTMAY = extract.question_type === 'tmay' || extract.turn_index === 0;

                if (y + 120 > doc.page.height - 60) {
                    doc.addPage();
                    drawHeader();
                    y = 80;
                }

                // Question label
                const qLabel = isTMAY ? 'Tell me about yourself' : `Question ${extract.turn_index}`;
                doc.fontSize(8).font(FONTS.bold).fillColor(COLORS.textMuted)
                    .text(qLabel.toUpperCase(), SPACING.pageMargin, y);
                y += 14;

                // Question text
                const qText = extract.question || '';
                doc.fontSize(10).font(FONTS.italic).fillColor(COLORS.textSecondary)
                    .text(qText, SPACING.pageMargin + 12, y, { width: width - 2 * SPACING.pageMargin - 12 });
                y += doc.heightOfString(qText, { width: width - 2 * SPACING.pageMargin - 12 }) + 8;

                // Candidate answer in a shaded box
                const answerText = extract.candidate_answer_verbatim || '(no answer captured)';
                const answerBoxWidth = width - 2 * SPACING.pageMargin;
                const answerInnerWidth = answerBoxWidth - 28;
                const answerHeight = doc.heightOfString(answerText, { width: answerInnerWidth }) + 20;

                if (y + answerHeight > doc.page.height - 60) {
                    doc.addPage();
                    drawHeader();
                    y = 80;
                }

                doc.rect(SPACING.pageMargin, y, answerBoxWidth, answerHeight).fill('#F8F7F4');
                doc.fontSize(9.5).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(answerText, SPACING.pageMargin + 14, y + 10, { width: answerInnerWidth });
                y += answerHeight + 6;

                // Signal annotation
                if (diagnostic) {
                    const signalColor = diagnostic.signal_strength === 'strong' ? '#0A7C42'
                        : diagnostic.signal_strength === 'mixed' ? '#8B5E00' : '#9B1C1C';
                    const signalLabel = diagnostic.signal_strength === 'strong' ? 'Strong signal'
                        : diagnostic.signal_strength === 'mixed' ? 'Mixed signal' : 'Weak signal';
                    const annotationText = `${signalLabel.toUpperCase()}  —  ${diagnostic.interviewer_consequence || diagnostic.impact_on_interviewer || ''}`;
                    doc.fontSize(8).font(FONTS.bold).fillColor(signalColor)
                        .text(annotationText, SPACING.pageMargin + 12, y,
                            { width: width - 2 * SPACING.pageMargin - 24 });
                    y += doc.heightOfString(annotationText, { width: width - 2 * SPACING.pageMargin - 24 }) + 14;
                } else {
                    y += 12;
                }

                // Separator line
                doc.moveTo(SPACING.pageMargin, y)
                    .lineTo(width - SPACING.pageMargin, y)
                    .strokeColor('#E0DFDC').lineWidth(0.5).stroke();
                y += 12;
            }

            drawFooter();
        }

        // --- PRO/PRO+ : PERSONAL ANSWER RULES ---
        // isExtendedEval matches the same pattern used in eval-logic.ts (Pro+ merged into Pro, Feb 2026)
        const isExtendedEval = tier === 'Pro' || tier === 'Pro+';
        if (isExtendedEval && evaluation.personal_answer_rules && Array.isArray(evaluation.personal_answer_rules)) {
            doc.addPage();
            drawHeader();
            y = 80;

            y = addSectionTitle('Your Personal Answer Rules', y);
            y = addBodyText('These are custom rules calibrated to your specific interview patterns. Apply these every time you answer:', y);
            y += 20;

            evaluation.personal_answer_rules.forEach((rule: string, index: number) => {
                y = checkPageBreak(y, 50);

                doc.fontSize(12).font(FONTS.bold).fillColor(COLORS.brandDark2)
                    .text(`${index + 1}. ${rule}`, SPACING.pageMargin, y);
                y += 25;
            });

            drawFooter();
        }

        // --- END DOCUMENT ---
        doc.end();
    });
}
