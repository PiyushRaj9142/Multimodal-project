import io
import csv
from typing import List, Dict, Any
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.models.entities import Session, AttendanceRecord, Recommendation, Student

def generate_session_csv(session: Session, attendance_records: List[AttendanceRecord]) -> str:
    """
    Generates a RFC-4180 compliant CSV string of the attendance register.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header metadata
    writer.writerow(["# MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT - SESSION REPORT"])
    writer.writerow(["Session ID", session.id])
    writer.writerow(["Title", session.title])
    writer.writerow(["Teacher", session.teacher_name])
    writer.writerow(["Start Time", session.start_time.isoformat() if session.start_time else "N/A"])
    writer.writerow(["End Time", session.end_time.isoformat() if session.end_time else "N/A"])
    writer.writerow(["Input Mode", session.input_mode])
    writer.writerow([])

    # Table columns
    writer.writerow([
        "Record ID",
        "Student Code",
        "Student Name / Track ID",
        "Status",
        "Source",
        "First Seen",
        "Last Seen",
        "Observed Duration (Seconds)",
        "Confidence",
        "Manually Corrected",
        "Notes"
    ])

    for r in attendance_records:
        student_name = r.student.display_name if r.student else (r.anonymous_track_id or "Anonymous Track")
        student_code = r.student.student_code if r.student else "N/A"
        writer.writerow([
            r.id,
            student_code,
            student_name,
            r.status.upper(),
            r.source,
            r.first_seen.strftime("%H:%M:%S") if r.first_seen else "N/A",
            r.last_seen.strftime("%H:%M:%S") if r.last_seen else "N/A",
            r.observed_duration,
            f"{r.confidence * 100:.1f}%",
            "YES" if r.manually_corrected else "NO",
            r.notes or ""
        ])

    return output.getvalue()

def generate_session_pdf(
    session: Session,
    attendance_records: List[AttendanceRecord],
    recommendations: List[Recommendation],
    avg_engagement: float
) -> bytes:
    """
    Generates an executive PDF report with attendance register, metrics, and ethical disclaimers.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=8
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor("#059669"),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#334155")
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceBefore=10
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("Multimodal Attendance & Engagement Agent", title_style))
    story.append(Paragraph(f"Official Session Intelligence Report &bull; Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    story.append(Spacer(1, 8))

    # Metadata Table
    present_count = sum(1 for r in attendance_records if r.status in ("present", "manually_confirmed"))
    total_count = len(attendance_records)
    rate = (present_count / max(1, total_count)) * 100

    meta_data = [
        [Paragraph("<b>Session Title:</b>", body_style), Paragraph(session.title, body_style),
         Paragraph("<b>Course Code:</b>", body_style), Paragraph(session.course.course_code if session.course else "N/A", body_style)],
        [Paragraph("<b>Teacher:</b>", body_style), Paragraph(session.teacher_name, body_style),
         Paragraph("<b>Input Mode:</b>", body_style), Paragraph(session.input_mode.replace("_", " ").title(), body_style)],
        [Paragraph("<b>Attendance Rate:</b>", body_style), Paragraph(f"{rate:.1f}% ({present_count}/{total_count})", body_style),
         Paragraph("<b>Average Engagement:</b>", body_style), Paragraph(f"{avg_engagement:.1f}/100", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[100, 170, 110, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Attendance Register Table
    story.append(Paragraph("1. Attendance Register", h2_style))
    att_table_data = [[
        Paragraph("<b>Student / Track</b>", body_style),
        Paragraph("<b>Status</b>", body_style),
        Paragraph("<b>Source</b>", body_style),
        Paragraph("<b>Observed</b>", body_style),
        Paragraph("<b>Corrected</b>", body_style)
    ]]

    for r in attendance_records[:25]:  # limit to 25 rows for concise page fit
        name = r.student.display_name if r.student else (r.anonymous_track_id or "Anonymous")
        status_color = "#059669" if r.status in ("present", "manually_confirmed") else "#d97706"
        status_p = Paragraph(f"<font color='{status_color}'><b>{r.status.upper()}</b></font>", body_style)
        att_table_data.append([
            Paragraph(name, body_style),
            status_p,
            Paragraph(r.source.replace("_", " ").title(), body_style),
            Paragraph(f"{int(r.observed_duration)}s", body_style),
            Paragraph("Yes" if r.manually_corrected else "No", body_style)
        ])

    att_table = Table(att_table_data, colWidths=[180, 110, 110, 70, 70])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(att_table)
    story.append(Spacer(1, 10))

    # AI Teaching Recommendations
    if recommendations:
        story.append(Paragraph("2. AI Teaching Assistant Insights", h2_style))
        for rec in recommendations[:3]:
            rec_text = f"<b>{rec.title}</b>: {rec.explanation} <br/><b>Suggested Action:</b> {rec.suggested_action}"
            story.append(Paragraph(rec_text, body_style))
            story.append(Spacer(1, 4))

    # Privacy & Ethical Framework Notice (Mandatory per section 1 & 15)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Ethical & Privacy Notice:</b> Behavioral indicators recorded herein are proxies for physical movement and presence, "
        "not verified indicators of student comprehension, intellectual focus, or academic ability. "
        "All data processed locally on-premise without cloud transmission. No automated disciplinary decisions are permitted.",
        disclaimer_style
    ))

    doc.build(story)
    return buffer.getvalue()
