"""Skill history / evolution signal tests."""

from app.models.schemas import Project, SkillHistoryEntry, SkillProficiency, WorkExperience
from app.services.skill_evolution import (
    build_skill_history,
    skill_evolution_narrative,
)


def test_build_skill_history_from_experience():
    history = build_skill_history(
        skills=[SkillProficiency(name="PyTorch", proficiency=5, years=4)],
        experiences=[
            WorkExperience(
                company="Acme",
                role="ML Engineer",
                start_date="2021-06",
                description="Built PyTorch training pipelines",
                is_current=True,
            )
        ],
        projects=[
            Project(
                name="Fraud Model",
                description="Serving",
                technologies=["PyTorch", "Kubernetes"],
            )
        ],
        certifications=["AWS ML Specialty (2024)"],
        reference_year=2026,
    )
    assert len(history) >= 3
    skills = {h.skill_name.lower() for h in history}
    assert "pytorch" in skills


def test_skill_evolution_narrative_shows_progression():
    history = [
        SkillHistoryEntry(skill_name="Python", year=2019, proficiency=2, source="experience"),
        SkillHistoryEntry(skill_name="Python", year=2024, proficiency=5, source="project"),
        SkillHistoryEntry(skill_name="PyTorch", year=2021, proficiency=3, source="experience"),
        SkillHistoryEntry(skill_name="PyTorch", year=2025, proficiency=5, source="certification"),
    ]
    lines = skill_evolution_narrative(history)
    assert any("PyTorch" in line for line in lines)
    assert any("→" in line for line in lines)