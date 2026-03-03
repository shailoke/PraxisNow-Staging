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
                    'STRONG_HIRE': { label: '⭐ STRONG HIRE', color: '#2e7d32' },
                    'HIRE': { label: '✅ HIRE', color: '#2e7d32' },
                    'BORDERLINE': { label: '⚠️ BORDERLINE', color: '#d32f2f' },
                    'NO_HIRE': { label: '❌ NO HIRE', color: '#d32f2f' }
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

        // 3. STRENGTHS
        if (evaluation.strengths && Array.isArray(evaluation.strengths)) {
            y = addSectionTitle('Core Strengths', y);

            evaluation.strengths.forEach((s: any) => {
                y = checkPageBreak(y, 100);

                doc.fontSize(12).font(FONTS.bold).fillColor(COLORS.success)
                    .text(`✓ ${s.skill}`, SPACING.pageMargin, y);
                y += 20;

                doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(s.observation, SPACING.pageMargin, y, { width: width - (2 * SPACING.pageMargin) });
                y += doc.heightOfString(s.observation, { width: width - (2 * SPACING.pageMargin) }) + 5;

                doc.fontSize(10).font(FONTS.italic).fillColor(COLORS.textSecondary)
                    .text(`Why checks out: ${s.why_it_matters}`, SPACING.pageMargin, y, { width: width - (2 * SPACING.pageMargin) });
                y += doc.heightOfString(`Why checks out: ${s.why_it_matters}`, { width: width - (2 * SPACING.pageMargin) }) + 20;
            });
            y += 10;
        }

        // 4. AREAS FOR IMPROVEMENT
        if (evaluation.areas_for_improvement && Array.isArray(evaluation.areas_for_improvement)) {
            y = checkPageBreak(y, 200);
            y = addSectionTitle('Areas for Improvement', y);

            evaluation.areas_for_improvement.forEach((imp: any) => {
                y = checkPageBreak(y, 100);

                // Gap Type Badge (if present)
                let gapBadge = '';
                let gapColor = COLORS.warning;
                if (imp.gap_type) {
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
                    .text(`⚠ ${gapBadge}${imp.limit}`, SPACING.pageMargin, y);
                y += 20;

                // Impact Scope (if present) - psychological clarity
                if (imp.impact_scope) {
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

                doc.fontSize(11).font(FONTS.regular).fillColor(COLORS.textPrimary)
                    .text(imp.why_it_matters, SPACING.pageMargin, y, { width: width - (2 * SPACING.pageMargin) });
                y += doc.heightOfString(imp.why_it_matters, { width: width - (2 * SPACING.pageMargin) }) + 20;
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

        // --- PRO+ ONLY: PERSONAL ANSWER RULES ---
        if (tier === 'Pro+' && evaluation.personal_answer_rules && Array.isArray(evaluation.personal_answer_rules)) {
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
