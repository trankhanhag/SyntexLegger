#!/usr/bin/env python3
import json
import os
import re

def update_readme():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    readme_path = os.path.join(base_dir, "README.md")
    index_path = os.path.join(base_dir, "skills_index.json")

    print(f"📖 Reading skills index from: {index_path}")
    with open(index_path, 'r', encoding='utf-8') as f:
        skills = json.load(f)

    total_skills = len(skills)
    print(f"🔢 Total skills found: {total_skills}")

    print(f"📝 Updating README at: {readme_path}")
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Title Count
    # Pattern: # 🌌 Antigravity Awesome Skills: [NUM]+ Agentic Skills
    content = re.sub(
        r'(# 🌌 Antigravity Awesome Skills: )\d+(\+ Agentic Skills)',
        f'\\g<1>{total_skills}\\g<2>',
        content
    )

    # 2. Update Blockquote Count
    # Pattern: Collection of [NUM]+ Universal
    content = re.sub(
        r'(Collection of )\d+(\+ Universal)',
        f'\\g<1>{total_skills}\\g<2>',
        content
    )

    # 3. Update Intro Text Count
    # Pattern: library of **[NUM] high-performance skills**
    content = re.sub(
        r'(library of \*\*)\d+( high-performance skills\*\*)',
        f'\\g<1>{total_skills}\\g<2>',
        content
    )

    # 4. Update Registry Header Count
    # Pattern: ## Full Skill Registry ([NUM]/[NUM])
    content = re.sub(
        r'(## Full Skill Registry \()\d+/\d+(\))',
        f'\\g<1>{total_skills}/{total_skills}\\g<2>',
        content
    )

    # 5. Generate New Registry Table
    print("🔄 Generating new registry table...")
    
    # Store the Note block to preserve it
    note_pattern = r'(> \[!NOTE\].*?)\n\n\| Skill Name'
    note_match = re.search(note_pattern, content, re.DOTALL)
    note_block = ""
    if note_match:
        note_block = note_match.group(1)
    else:
        # Fallback default note if not found (though it should be there)
        note_block = "> [!NOTE] > **Document Skills**: We provide both **community** and **official Anthropic** versions for DOCX, PDF, PPTX, and XLSX. Locally, the official versions are used by default (via symlinks). In the repository, both versions are available for flexibility."

    table_header = "| Skill Name | Description | Path |\n| :--- | :--- | :--- |"
    table_rows = []

    for skill in skills:
        name = skill.get('name', 'Unknown')
        desc = skill.get('description', '').replace('\n', ' ').strip()
        path = skill.get('path', '')
        
        # Escape pipes in description to strictly avoid breaking the table
        desc = desc.replace('|', '\|')
        
        row = f"| **{name}** | {desc} | `{path}` |"
        table_rows.append(row)

    new_table_section = f"{note_block}\n\n{table_header}\n" + "\n".join(table_rows)

    # Replace the old table section
    # We look for the start of the section and the end (which is either the next H2 or EOF)
    # The section starts after "## Full Skill Registry (X/X)"
    
    # First, find the header position
    header_pattern = r'## Full Skill Registry \(\d+/\d+\)'
    header_match = re.search(header_pattern, content)
    
    if not header_match:
        print("❌ Could not find 'Full Skill Registry' header.")
        return

    start_pos = header_match.end()
    
    # Find the next section (## ...) or end of file
    next_section_match = re.search(r'\n## ', content[start_pos:])
    
    if next_section_match:
        end_pos = start_pos + next_section_match.start()
        # Keep everything after the table
        rest_of_file = content[end_pos:]
    else:
        # Table goes to end of file
        rest_of_file = ""

    # Check for text between Header and Table (usually just newlines or the Note)
    # We replace everything from Header End to Next Section with our New Table Section
    # but we need to supply the pre-table Note which we extracted/re-generated above.
    
    # Simplification: We construct the top part (before header), add header, add new table section, add rest.
    
    before_header = content[:header_match.start()]
    new_header = f"## Full Skill Registry ({total_skills}/{total_skills})"
    
    new_content = f"{before_header}{new_header}\n\n{new_table_section}\n{rest_of_file}"

    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("✅ README.md updated successfully.")

if __name__ == "__main__":
    update_readme()
