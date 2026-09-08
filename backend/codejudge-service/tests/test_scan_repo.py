import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

from agentic_legibility_score import scan_repo


class ScanRepoTests(unittest.TestCase):
    def make_sample_repo(self) -> Path:
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        root = Path(temp_dir.name)

        (root / "README.md").write_text(
            textwrap.dedent(
                """
                # Sample Repo

                ## Getting Started

                Run `python -m unittest` after install.

                ## Development

                Use `python app.py` to start the app.
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        (root / "pyproject.toml").write_text(
            textwrap.dedent(
                """
                [project]
                name = "sample"
                version = "0.1.0"

                [project.scripts]
                sample = "sample:main"

                [tool.ruff]
                line-length = 88
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        (root / ".gitignore").write_text(".env\n.env.*\n*.key\n", encoding="utf-8")
        (root / ".env.example").write_text("API_TOKEN=example\n", encoding="utf-8")
        (root / "tests").mkdir()
        (root / "tests" / "test_app.py").write_text("def test_placeholder():\n    assert True\n", encoding="utf-8")
        (root / ".github" / "workflows").mkdir(parents=True)
        (root / ".github" / "workflows" / "ci.yml").write_text(
            textwrap.dedent(
                """
                name: CI
                on: [push]
                jobs:
                  test:
                    runs-on: ubuntu-latest
                    steps:
                      - run: python -m unittest
                      - run: python -m ruff check .
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

        return root

    def test_scan_repo_detects_expected_signals(self) -> None:
        root = self.make_sample_repo()

        result = scan_repo(str(root))

        self.assertEqual(result["repo_name"], root.name)
        self.assertTrue(result["categories"]["bootstrap"]["readme_exists"])
        self.assertTrue(result["categories"]["bootstrap"]["env_example"])
        self.assertTrue(result["categories"]["entry_points"]["pyproject_has_scripts"])
        self.assertTrue(result["categories"]["testing"]["has_test_dir"])
        self.assertTrue(result["categories"]["testing"]["ci_configured"])
        self.assertTrue(result["categories"]["testing"]["ci_runs_tests"])
        self.assertTrue(result["categories"]["testing"]["ci_runs_lint"])
        self.assertTrue(result["categories"]["security"]["gitignore_covers_env"])

    def test_standalone_wrapper_emits_json(self) -> None:
        root = self.make_sample_repo()

        completed = subprocess.run(
            [sys.executable, "scripts/scan_repo.py", str(root)],
            cwd=Path(__file__).resolve().parents[1],
            capture_output=True,
            text=True,
            check=True,
        )

        payload = json.loads(completed.stdout)
        self.assertEqual(payload["repo_path"], str(root.resolve()))
        self.assertIn("documentation", payload["categories"])

    def make_dotnet_repo(self) -> Path:
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        root = Path(temp_dir.name)

        (root / "README.md").write_text(
            textwrap.dedent(
                """
                # Sample Dotnet Repo

                ## Quick Start

                Run `dotnet restore`, `dotnet build`, and `dotnet test`.

                ## Development

                Use `dotnet run --project src/App/App.csproj` during local development.
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        (root / "App.sln").write_text("\n", encoding="utf-8")
        (root / "global.json").write_text('{"sdk": {"version": "8.0.100"}}\n', encoding="utf-8")
        (root / "Directory.Build.props").write_text(
            textwrap.dedent(
                """
                <Project>
                  <PropertyGroup>
                    <Nullable>enable</Nullable>
                    <AnalysisLevel>latest</AnalysisLevel>
                    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
                  </PropertyGroup>
                  <ItemGroup>
                    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="8.0.0" />
                  </ItemGroup>
                </Project>
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        (root / ".editorconfig").write_text("root = true\n", encoding="utf-8")
        (root / ".gitignore").write_text("bin/\nobj/\n.env\n", encoding="utf-8")
        (root / ".github" / "workflows").mkdir(parents=True)
        (root / ".github" / "workflows" / "ci.yml").write_text(
            textwrap.dedent(
                """
                name: CI
                on: [push]
                jobs:
                  build:
                    runs-on: ubuntu-latest
                    steps:
                      - run: dotnet build App.sln
                      - run: dotnet test App.sln
                      - run: dotnet format --verify-no-changes
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

        (root / "src" / "App").mkdir(parents=True)
        (root / "src" / "App" / "App.csproj").write_text(
            textwrap.dedent(
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <PropertyGroup>
                    <TargetFramework>net8.0</TargetFramework>
                  </PropertyGroup>
                </Project>
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )

        (root / "tests" / "App.Tests").mkdir(parents=True)
        (root / "tests" / "App.Tests" / "App.Tests.csproj").write_text(
            textwrap.dedent(
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <PropertyGroup>
                    <TargetFramework>net8.0</TargetFramework>
                  </PropertyGroup>
                  <ItemGroup>
                    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.10.0" />
                    <PackageReference Include="xunit" Version="2.9.0" />
                  </ItemGroup>
                </Project>
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        (root / "tests" / "App.Tests" / "packages.lock.json").write_text("{}\n", encoding="utf-8")
        (root / "tests" / "App.Tests" / "coverlet.runsettings").write_text("<RunSettings />\n", encoding="utf-8")

        return root

    def test_scan_repo_detects_dotnet_signals(self) -> None:
        root = self.make_dotnet_repo()

        result = scan_repo(str(root))

        bootstrap = result["categories"]["bootstrap"]
        entry_points = result["categories"]["entry_points"]
        testing = result["categories"]["testing"]
        code_quality = result["categories"]["code_quality"]

        self.assertTrue(bootstrap["package_manifest"])
        self.assertTrue(bootstrap["lockfile"])
        self.assertTrue(bootstrap["readme_has_commands"])
        self.assertTrue(entry_points["has_build_script"])
        self.assertTrue(entry_points["has_test_script"])
        self.assertTrue(entry_points["has_lint_script"])
        self.assertTrue(entry_points["has_format_script"])
        self.assertTrue(entry_points["has_dev_script"])
        self.assertTrue(testing["has_test_dir"])
        self.assertTrue(testing["ci_runs_tests"])
        self.assertTrue(testing["ci_runs_lint"])
        self.assertTrue(testing["ci_runs_typecheck"])
        self.assertTrue(code_quality["has_linter"])
        self.assertTrue(code_quality["has_formatter"])
        self.assertTrue(code_quality["has_typecheck"])
        self.assertTrue(code_quality["nullable_enabled"])


if __name__ == "__main__":
    unittest.main()
