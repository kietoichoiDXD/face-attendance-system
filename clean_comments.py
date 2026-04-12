import os
import re
from pathlib import Path

def remove_python_comments(content):
    lines = content.split('\n')
    result = []
    in_triple_quote = False
    triple_quote_char = None
    
    for line in lines:
        stripped = line.lstrip()
        
        if '"""' in line or "'''" in line:
            quote = '"""' if '"""' in line else "'''"
            if not in_triple_quote:
                in_triple_quote = True
                triple_quote_char = quote
                idx = line.find(quote)
                before = line[:idx]
                after = line[idx+3:]
                if quote in after:
                    in_triple_quote = False
                    result.append(line)
                else:
                    result.append(before)
            else:
                if quote == triple_quote_char:
                    in_triple_quote = False
                    idx = line.find(quote)
                    result.append(line[idx+3:])
                else:
                    result.append(line)
        elif in_triple_quote:
            continue
        elif stripped.startswith('#'):
            if result and result[-1].strip() == '':
                result.pop()
        else:
            if '#' in line and not ('"' in line or "'" in line):
                line = re.sub(r'#.*$', '', line).rstrip()
            result.append(line)
    
    return '\n'.join(result)

def remove_js_comments(content):
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        if '//' in line:
            idx = line.find('//')
            if '"' not in line[:idx] and "'" not in line[:idx]:
                line = line[:idx].rstrip()
        
        if line.strip().startswith('/*'):
            start_idx = i
            if '*/' in line:
                end_idx = line.find('*/')
                before = line[:line.find('/*')]
                after = line[end_idx+2:] if end_idx + 2 < len(line) else ''
                line = (before + after).strip()
                result.append(line)
            else:
                i += 1
                while i < len(lines):
                    if '*/' in lines[i]:
                        end_idx = lines[i].find('*/')
                        after = lines[i][end_idx+2:].strip()
                        if after:
                            result.append(after)
                        break
                    i += 1
            i += 1
            continue
        
        if line.strip():
            result.append(line)
        elif result and result[-1].strip():
            result.append(line)
        
        i += 1
    
    return '\n'.join(result)

python_files = [
    'backend/src/main.py',
    'backend/src/config.py',
    'backend/src/embedding.py',
    'backend/src/vision.py',
    'backend/src/mock_data.py',
    'backend/src/local_api.py',
]

js_files = [
    'frontend/src/api.js',
    'frontend/src/main.jsx',
    'frontend/src/App.jsx',
    'frontend/vite.config.js',
    'frontend/eslint.config.js',
]

base_path = Path('.')

for py_file in python_files:
    filepath = base_path / py_file
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        cleaned = remove_python_comments(content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(cleaned)
        print(f"✓ Cleaned {py_file}")

for js_file in js_files:
    filepath = base_path / js_file
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        cleaned = remove_js_comments(content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(cleaned)
        print(f"✓ Cleaned {js_file}")

print("\nAll comments removed!")
