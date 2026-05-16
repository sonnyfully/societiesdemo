"""Render the short research note PDF.

This script uses ReportLab from the bundled Codex document runtime because a
LaTeX engine is not installed in the local workspace.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
NOTE_PDF = ROOT / "note" / "note.pdf"
PUBLIC_PDF = ROOT / "frontend" / "public" / "note.pdf"


def build_pdf() -> None:
    PUBLIC_PDF.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="NoteTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            alignment=0,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="NoteSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#555555"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="NoteHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            spaceBefore=6,
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="NoteBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12.4,
            spaceAfter=5,
        )
    )

    doc = SimpleDocTemplate(
        str(NOTE_PDF),
        pagesize=letter,
        rightMargin=0.62 * inch,
        leftMargin=0.62 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Homophily under model substitution",
        author="Sonny Fullerton",
    )

    story = [
        Paragraph(
            "Homophily under model substitution:<br/>"
            "A scaled-down Claude Haiku replication of He et al. (2026)",
            styles["NoteTitle"],
        ),
        Paragraph("Sonny Fullerton | May 2026", styles["NoteSubtitle"]),
        Paragraph("Research question", styles["NoteHeading"]),
        Paragraph(
            "He et al. (2026) report that GPT-3.5-powered agents on Chirper.ai formed "
            "homophilous social structures without being instructed to do so. This short "
            "replication asks whether the core mechanism generalises across model families "
            "and time: if the same type of engagement environment is rebuilt with Claude "
            "Haiku 4.5 in May 2026, do agents still preferentially engage with semantically "
            "similar others?",
            styles["NoteBody"],
        ),
        Paragraph("Design", styles["NoteHeading"]),
        Paragraph(
            "I ran a topic simulation rather than a faithful clone of Chirper. The "
            "goal was to preserve the paper's central mechanism--agents posting, reading a "
            "mixed feed, and choosing whom to engage with--while keeping the build small "
            "enough to inspect end to end. The completed run, full-stage8, used 50 Claude "
            "Haiku 4.5 agents over 8 rounds on the topic: Should universities ban AI in "
            "coursework?",
            styles["NoteBody"],
        ),
        Paragraph(
            "Agents were balanced across five latent perspectives: pro-ban traditionalists, "
            "anti-ban accelerationists, pragmatic reformers, sceptical empiricists, and "
            "indifferent generalists. The first ten generated personas were inspected before "
            "the full rounds began. They were accepted because they were topic-specific, "
            "varied in profession and context, and did not contain instructions to prefer "
            "similar others. In each round, every agent wrote a short post and then chose "
            "1-3 posts from a mixed feed to like, follow, or ignore.",
            styles["NoteBody"],
        ),
        Paragraph(
            "The measurement stack follows the original paper where possible. Agent post "
            "histories were embedded with sentence-transformers/all-MiniLM-L6-v2, the same "
            "embedding model used by He et al. Weighted engagement graphs were analysed with "
            "Louvain community detection, modularity, assortativity by detected community, "
            "and a 100-iteration degree-preserving bootstrap null.",
            styles["NoteBody"],
        ),
        Paragraph("Results", styles["NoteHeading"]),
    ]

    table = Table(
        [
            ["Metric", "He et al. English subset", "Claude Haiku simulation"],
            ["Agents / duration", "17,746 / 28 days", "50 / 8 rounds"],
            ["Final communities", "--", "5"],
            ["Final modularity", "0.38", "0.133"],
            ["Bootstrap 95% null interval", "--", "[0.100, 0.130]"],
            ["Bootstrap p-value", "< .001", "0.010"],
            ["Final assortativity", "0.61", "0.067"],
            ["Content-engagement correlation", "significant in paper", "0.066"],
        ],
        colWidths=[2.15 * inch, 2.1 * inch, 2.0 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.3),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#141414")),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#333333")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#9a9a9a")),
                ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#9a9a9a")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f7f7")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.extend(
        [
            table,
            Spacer(1, 6),
            Paragraph(
                "The final engagement graph's modularity was 0.133, slightly above the "
                "upper bound of the degree-preserving bootstrap null interval [0.100, "
                "0.130], with p = 0.010. Assortativity was positive (0.067), and the "
                "content-engagement correlation was also positive (0.066). These values "
                "are much smaller than the original Chirper results, but they are "
                "directionally consistent and statistically above the graph null used here.",
                styles["NoteBody"],
            ),
            Paragraph(
                "<b>Classification:</b> the core finding reproduces, with attenuated "
                "magnitude. The simulation does not match the scale, platform richness, "
                "or effect size of the original paper. It does show that the mechanism is "
                "not obviously confined to GPT-3.5, the Chirper platform, or the 2023 "
                "data collection window.",
                styles["NoteBody"],
            ),
            Paragraph("Interpretation", styles["NoteHeading"]),
            Paragraph(
                "The result is useful because it tests the part of the finding that matters "
                "for synthetic-audience systems: interaction can change a simulated "
                "population. Even when personas begin balanced across perspectives, repeated "
                "engagement choices can create structure. In a commercial setting, that means "
                "a synthetic audience is not only a static panel of persona cards; it is a "
                "social process that can concentrate attention and amplify similarity over time.",
                styles["NoteBody"],
            ),
            Paragraph(
                "For a system such as Radiant, the product implication is not that homophily "
                "is a flaw. Human groups are homophilous too. The practical risk is unobserved "
                "diversity collapse: a simulated buyer committee, shareholder base, or policy "
                "audience may begin diverse but become less diverse through repeated rounds of "
                "interaction. A dashboard that surfaces modularity, assortativity, and "
                "content-similarity engagement over time would make that drift visible to users.",
                styles["NoteBody"],
            ),
            Paragraph("Limitations", styles["NoteHeading"]),
            Paragraph(
                "This is a scaled-down replication, not a full reproduction. It uses one seed "
                "topic, 50 agents, and 8 rounds, while He et al. analysed tens of thousands of "
                "agents over 28 days on a richer social platform. The feed is a compact "
                "topic simulation approximation rather than a live Twitter-like system with "
                "multi-topic dynamics. Community detection also differs: I used Louvain because "
                "it is a modern weighted-graph default, while the paper reports label propagation "
                "and fast-greedy variants. Finally, the effect size is modest. The honest claim "
                "is generalisation of direction and statistical signal, not magnitude matching.",
                styles["NoteBody"],
            ),
            Paragraph("Conclusion", styles["NoteHeading"]),
            Paragraph(
                "Re-running the homophily mechanism with Claude Haiku 4.5 produces weak but "
                "statistically detectable homophilous structure. The result supports the "
                "paper's call for model-family replications and suggests a concrete diagnostic "
                "for synthetic-audience products: track whether simulated populations remain "
                "diverse after they begin interacting.",
                styles["NoteBody"],
            ),
            Paragraph(
                "<b>Artifacts.</b> Dashboard: https://homophily-simulation.vercel.app. "
                "Saved run id: full-stage8. Raw run file: backend/runs/full-stage8.json "
                "(local, gitignored).",
                styles["NoteBody"],
            ),
        ]
    )

    doc.build(story)
    shutil.copyfile(NOTE_PDF, PUBLIC_PDF)


if __name__ == "__main__":
    build_pdf()
