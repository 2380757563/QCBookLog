import sys
import json

data = json.load(sys.stdin)
print(f'Total books: {len(data)}')
for b in data[:10]:
    print(f'Book {b["id"]}: book_type={b.get("book_type", "N/A")}')