#!/usr/bin/env python3
"""Extract clean content from Google Sites HTML export files."""

import os
import re
from pathlib import Path
from html.parser import HTMLParser

class GoogleSitesHTMLParser(HTMLParser):
    """Parse Google Sites HTML and extract clean content."""
    
    def __init__(self):
        super().__init__()
        self.text_content = []
        self.in_script = False
        self.in_style = False
        self.skip_tags = {'script', 'style', 'noscript', 'meta', 'link', 'head'}
        
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}:
            setattr(self, f'in_{tag}', True)
    
    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            setattr(self, f'in_{tag}', False)
    
    def handle_data(self, data):
        if not self.in_script and not self.in_style:
            # Clean up whitespace
            text = data.strip()
            if text and len(text) > 2:  # Ignore very short fragments
                self.text_content.append(text)
    
    def get_content(self):
        """Return cleaned content."""
        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for item in self.text_content:
            if item not in seen and len(item) > 3:
                seen.add(item)
                unique.append(item)
        return '\n'.join(unique)

def extract_from_html(filepath):
    """Extract clean content from HTML file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()
        
        parser = GoogleSitesHTMLParser()
        parser.feed(html_content)
        return parser.get_content()
    except Exception as e:
        return f"Error reading file: {e}"

def main():
    old_site_dir = Path(__file__).parent
    
    # Find all HTML files
    html_files = sorted(old_site_dir.glob('*.html'))
    
    print("GOOGLE SITES CONTENT EXTRACTION\n")
    
    for html_file in html_files:
        print(f"\n{'='*70}")
        print(f"FILE: {html_file.name}")
        print('='*70)
        
        content = extract_from_html(html_file)
        lines = content.split('\n')
        
        # Show first 60 lines or all if less
        display_lines = min(60, len(lines))
        for i, line in enumerate(lines[:display_lines]):
            print(line)
        
        if len(lines) > 60:
            print(f"\n... ({len(lines) - 60} more lines)")
        
        print(f"\nLINES: {len(lines)}, FILE SIZE: {html_file.stat().st_size / 1024:.1f} KB")

if __name__ == '__main__':
    main()
