"""Natural language search parser tests."""

from app.services.search_parser import parse_nl_query


def test_react_native_usa_query():
    parsed = parse_nl_query("React Native developers in USA")
    assert "React Native" in parsed.required_skills
    assert any("United States" in loc or "Usa" in loc.title() for loc in parsed.locations) or "United States" in parsed.locations


def test_sql_lacking_power_bi():
    parsed = parse_nl_query("Show candidates strong in SQL but lacking Power BI")
    assert "SQL" in parsed.required_skills
    assert "Power BI" in parsed.excluded_skills