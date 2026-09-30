import os
from fpdf import FPDF

class MatrixPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", 'B', 15)
        self.cell(0, 10, "Smart India Hackathon - Evaluation Matrix", ln=True, align="C")
        self.ln(5)
        
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", 'I', 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

pdf = MatrixPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=11)

intro_text = """This document outlines the standard evaluation matrix and criteria used by the SIH CodeJudge Service to assess student submissions. The evaluation is scored out of a maximum of 100 points, broken down into Primary Criteria (50%), Technical Quality (35%), and Ancillary Criteria (15%)."""
pdf.multi_cell(0, 7, intro_text)
pdf.ln(5)

pdf.set_font("Helvetica", 'B', 12)
pdf.cell(0, 10, "1. Primary Criteria (50% of Score)", ln=True)
pdf.set_font("Helvetica", size=11)
pdf.multi_cell(0, 7, "- Problem Statement Alignment (25 Points): Requirement matching and explicit evidence that the submitted project satisfies the exact constraints of the chosen problem statement.\n- Functional Implementation (25 Points): Build and run evidence, along with functional/API testing proving that the core system is actually working.")
pdf.ln(3)

pdf.set_font("Helvetica", 'B', 12)
pdf.cell(0, 10, "2. Technical Quality (35% of Score)", ln=True)
pdf.set_font("Helvetica", size=11)
pdf.multi_cell(0, 7, "- Engineering / Code Quality (15 Points): Clean codebase standards, proper entry points, bootstrap mechanisms, and agentic-legibility.\n- Architecture (10 Points): Modularity, appropriate layering, structured project directories, and clear separation of concerns.\n- Testing (10 Points): Presence of a test suite, valid test configurations, and active validation signals.")
pdf.ln(3)

pdf.set_font("Helvetica", 'B', 12)
pdf.cell(0, 10, "3. Ancillary Criteria (15% of Score)", ln=True)
pdf.set_font("Helvetica", size=11)
pdf.multi_cell(0, 7, "- Innovation (5 Points): The quality of the idea/approach (advisory/human-curable).\n- Security (5 Points): Proper .gitignore setup, dependency-update hygiene, and lack of exposed secrets/SAST findings.\n- Documentation (5 Points): Presence of a comprehensive README.md, setup instructions, API docs, and contributing guides.")
pdf.ln(5)

pdf.set_font("Helvetica", 'B', 12)
pdf.cell(0, 10, "Automated Penalty Policies", ln=True)
pdf.set_font("Helvetica", size=11)
pdf.multi_cell(0, 7, "- Critical Security Finding: Any critical finding (e.g., exposed AWS keys) immediately blocks the evaluation and flags it as BLOCKED.\n- High Security Penalty: Every HIGH security finding deducts 3 points from the Security category.\n- Passing Threshold: A minimum automated score of 40 points is expected for passing (subject to manual evaluator decision).")

pdf.output("c:\\Users\\Bhavik\\Documents\\sih-round-2\\v4\\Manthan-Churning-Ideas-into-Solutions\\frontend\\innovation-portal-web\\public\\evaluation-matrix.pdf")
print("PDF generated successfully.")
