# 数据库结构详细分析报告

生成时间: 2026/2/8 21:09:16

## Calibre 数据库 (metadata.db)

### 表统计

总表数: 38

### 表结构详情

#### annotations

**SQL定义:**
```sql
CREATE TABLE annotations ( id INTEGER PRIMARY KEY,
	book INTEGER NOT NULL,
	format TEXT NOT NULL COLLATE NOCASE,
	user_type TEXT NOT NULL,
	user TEXT NOT NULL,
	timestamp REAL NOT NULL,
	annot_id TEXT NOT NULL,
	annot_type TEXT NOT NULL,
	annot_data TEXT NOT NULL,
    searchable_text TEXT NOT NULL DEFAULT '',
    UNIQUE(book, user_type, user, format, annot_type, annot_id)
)
```

**字段列表 (10个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| format | TEXT |  | ✅ |  |
| user_type | TEXT |  | ✅ |  |
| user | TEXT |  | ✅ |  |
| timestamp | REAL |  | ✅ |  |
| annot_id | TEXT |  | ✅ |  |
| annot_type | TEXT |  | ✅ |  |
| annot_data | TEXT |  | ✅ |  |
| searchable_text | TEXT |  | ✅ | '' |

**索引列表 (2个):**

- annot_idx (book)
- sqlite_autoindex_annotations_1 (book, user_type, user, format, annot_type, annot_id)

#### annotations_dirtied

**SQL定义:**
```sql
CREATE TABLE annotations_dirtied(id INTEGER PRIMARY KEY,
                             book INTEGER NOT NULL,
                             UNIQUE(book))
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_annotations_dirtied_1 (book)

#### annotations_fts

**SQL定义:**
```sql
CREATE VIRTUAL TABLE annotations_fts USING fts5(searchable_text, content = 'annotations', content_rowid = 'id', tokenize = 'unicode61 remove_diacritics 2')
```

**字段列表 (1个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| searchable_text |  |  |  |  |

#### annotations_fts_config

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| k |  | ✅ | ✅ |  |
| v |  |  |  |  |

**索引列表 (1个):**

- sqlite_autoindex_annotations_fts_config_1 (k)

#### annotations_fts_data

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_data'(id INTEGER PRIMARY KEY, block BLOB)
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| block | BLOB |  |  |  |

#### annotations_fts_docsize

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB)
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| sz | BLOB |  |  |  |

#### annotations_fts_idx

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| segid |  | ✅ | ✅ |  |
| term |  | ✅ | ✅ |  |
| pgno |  |  |  |  |

**索引列表 (1个):**

- sqlite_autoindex_annotations_fts_idx_1 (segid, term)

#### annotations_fts_stemmed

**SQL定义:**
```sql
CREATE VIRTUAL TABLE annotations_fts_stemmed USING fts5(searchable_text, content = 'annotations', content_rowid = 'id', tokenize = 'porter unicode61 remove_diacritics 2')
```

**字段列表 (1个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| searchable_text |  |  |  |  |

#### annotations_fts_stemmed_config

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_stemmed_config'(k PRIMARY KEY, v) WITHOUT ROWID
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| k |  | ✅ | ✅ |  |
| v |  |  |  |  |

**索引列表 (1个):**

- sqlite_autoindex_annotations_fts_stemmed_config_1 (k)

#### annotations_fts_stemmed_data

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_stemmed_data'(id INTEGER PRIMARY KEY, block BLOB)
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| block | BLOB |  |  |  |

#### annotations_fts_stemmed_docsize

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_stemmed_docsize'(id INTEGER PRIMARY KEY, sz BLOB)
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| sz | BLOB |  |  |  |

#### annotations_fts_stemmed_idx

**SQL定义:**
```sql
CREATE TABLE 'annotations_fts_stemmed_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| segid |  | ✅ | ✅ |  |
| term |  | ✅ | ✅ |  |
| pgno |  |  |  |  |

**索引列表 (1个):**

- sqlite_autoindex_annotations_fts_stemmed_idx_1 (segid, term)

#### authors

**SQL定义:**
```sql
CREATE TABLE authors ( id   INTEGER PRIMARY KEY,
                              name TEXT NOT NULL COLLATE NOCASE,
                              sort TEXT COLLATE NOCASE,
                              link TEXT NOT NULL DEFAULT '',
                              UNIQUE(name)
                             )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| sort | TEXT |  |  |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (1个):**

- sqlite_autoindex_authors_1 (name)

#### books

**SQL定义:**
```sql
CREATE TABLE books ( id      INTEGER PRIMARY KEY AUTOINCREMENT,
                             title     TEXT NOT NULL DEFAULT 'Unknown' COLLATE NOCASE,
                             sort      TEXT COLLATE NOCASE,
                             timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             pubdate   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             series_index REAL NOT NULL DEFAULT 1.0,
                             author_sort TEXT COLLATE NOCASE,
                             isbn TEXT DEFAULT '' COLLATE NOCASE,
                             lccn TEXT DEFAULT '' COLLATE NOCASE,
                             path TEXT NOT NULL DEFAULT '',
                             flags INTEGER NOT NULL DEFAULT 1,
                             uuid TEXT,
                             has_cover BOOL DEFAULT 0,
                             last_modified TIMESTAMP NOT NULL DEFAULT '2000-01-01 00:00:00+00:00')
```

**字段列表 (14个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| title | TEXT |  | ✅ | 'Unknown' |
| sort | TEXT |  |  |  |
| timestamp | TIMESTAMP |  |  | CURRENT_TIMESTAMP |
| pubdate | TIMESTAMP |  |  | CURRENT_TIMESTAMP |
| series_index | REAL |  | ✅ | 1.0 |
| author_sort | TEXT |  |  |  |
| isbn | TEXT |  |  | '' |
| lccn | TEXT |  |  | '' |
| path | TEXT |  | ✅ | '' |
| flags | INTEGER |  | ✅ | 1 |
| uuid | TEXT |  |  |  |
| has_cover | BOOL |  |  | 0 |
| last_modified | TIMESTAMP |  | ✅ | '2000-01-01 00:00:00+00:00' |

**索引列表 (2个):**

- books_idx (sort)
- authors_idx (author_sort)

#### books_authors_link

**SQL定义:**
```sql
CREATE TABLE books_authors_link ( id INTEGER PRIMARY KEY,
                                          book INTEGER NOT NULL,
                                          author INTEGER NOT NULL,
                                          UNIQUE(book, author)
                                        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| author | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_authors_link_bidx (book)
- books_authors_link_aidx (author)
- sqlite_autoindex_books_authors_link_1 (book, author)

#### books_custom_column_2_link

**SQL定义:**
```sql
CREATE TABLE books_custom_column_2_link(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book INTEGER NOT NULL,
                    value INTEGER NOT NULL,
                    
                    UNIQUE(book, value)
                    )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| value | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_custom_column_2_link_aidx (value)
- books_custom_column_2_link_bidx (book)
- sqlite_autoindex_books_custom_column_2_link_1 (book, value)

#### books_languages_link

**SQL定义:**
```sql
CREATE TABLE books_languages_link ( id INTEGER PRIMARY KEY,
                                            book INTEGER NOT NULL,
                                            lang_code INTEGER NOT NULL,
                                            item_order INTEGER NOT NULL DEFAULT 0,
                                            UNIQUE(book, lang_code)
        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| lang_code | INTEGER |  | ✅ |  |
| item_order | INTEGER |  | ✅ | 0 |

**索引列表 (3个):**

- books_languages_link_bidx (book)
- books_languages_link_aidx (lang_code)
- sqlite_autoindex_books_languages_link_1 (book, lang_code)

#### books_plugin_data

**SQL定义:**
```sql
CREATE TABLE books_plugin_data(id INTEGER PRIMARY KEY,
                                     book INTEGER NOT NULL,
                                     name TEXT NOT NULL,
                                     val TEXT NOT NULL,
                                     UNIQUE(book,name))
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| name | TEXT |  | ✅ |  |
| val | TEXT |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_books_plugin_data_1 (book, name)

#### books_publishers_link

**SQL定义:**
```sql
CREATE TABLE books_publishers_link ( id INTEGER PRIMARY KEY,
                                          book INTEGER NOT NULL,
                                          publisher INTEGER NOT NULL,
                                          UNIQUE(book)
                                        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| publisher | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_publishers_link_bidx (book)
- books_publishers_link_aidx (publisher)
- sqlite_autoindex_books_publishers_link_1 (book)

#### books_ratings_link

**SQL定义:**
```sql
CREATE TABLE books_ratings_link ( id INTEGER PRIMARY KEY,
                                          book INTEGER NOT NULL,
                                          rating INTEGER NOT NULL,
                                          UNIQUE(book, rating)
                                        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| rating | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_ratings_link_bidx (book)
- books_ratings_link_aidx (rating)
- sqlite_autoindex_books_ratings_link_1 (book, rating)

#### books_series_link

**SQL定义:**
```sql
CREATE TABLE books_series_link ( id INTEGER PRIMARY KEY,
                                          book INTEGER NOT NULL,
                                          series INTEGER NOT NULL,
                                          UNIQUE(book)
                                        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| series | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_series_link_bidx (book)
- books_series_link_aidx (series)
- sqlite_autoindex_books_series_link_1 (book)

#### books_tags_link

**SQL定义:**
```sql
CREATE TABLE books_tags_link ( id INTEGER PRIMARY KEY,
                                          book INTEGER NOT NULL,
                                          tag INTEGER NOT NULL,
                                          UNIQUE(book, tag)
                                        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| tag | INTEGER |  | ✅ |  |

**索引列表 (3个):**

- books_tags_link_bidx (book)
- books_tags_link_aidx (tag)
- sqlite_autoindex_books_tags_link_1 (book, tag)

#### comments

**SQL定义:**
```sql
CREATE TABLE comments ( id INTEGER PRIMARY KEY,
                              book INTEGER NOT NULL,
                              text TEXT NOT NULL COLLATE NOCASE,
                              UNIQUE(book)
                            )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| text | TEXT |  | ✅ |  |

**索引列表 (2个):**

- comments_idx (book)
- sqlite_autoindex_comments_1 (book)

#### conversion_options

**SQL定义:**
```sql
CREATE TABLE conversion_options ( id INTEGER PRIMARY KEY,
                                          format TEXT NOT NULL COLLATE NOCASE,
                                          book INTEGER,
                                          data BLOB NOT NULL,
                                          UNIQUE(format,book)
                                        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| format | TEXT |  | ✅ |  |
| book | INTEGER |  |  |  |
| data | BLOB |  | ✅ |  |

**索引列表 (3个):**

- conversion_options_idx_b (book)
- conversion_options_idx_a (format)
- sqlite_autoindex_conversion_options_1 (format, book)

#### custom_column_2

**SQL定义:**
```sql
CREATE TABLE custom_column_2(
                    id    INTEGER PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL COLLATE NOCASE,
                    link TEXT NOT NULL DEFAULT "",
                    UNIQUE(value))
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| value | TEXT |  | ✅ |  |
| link | TEXT |  | ✅ | "" |

**索引列表 (2个):**

- custom_column_2_idx (value)
- sqlite_autoindex_custom_column_2_1 (value)

#### custom_columns

**SQL定义:**
```sql
CREATE TABLE custom_columns (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    label    TEXT NOT NULL,
                    name     TEXT NOT NULL,
                    datatype TEXT NOT NULL,
                    mark_for_delete   BOOL DEFAULT 0 NOT NULL,
                    editable BOOL DEFAULT 1 NOT NULL,
                    display  TEXT DEFAULT '{}' NOT NULL,
                    is_multiple BOOL DEFAULT 0 NOT NULL,
                    normalized BOOL NOT NULL,
                    UNIQUE(label)
                )
```

**字段列表 (9个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| label | TEXT |  | ✅ |  |
| name | TEXT |  | ✅ |  |
| datatype | TEXT |  | ✅ |  |
| mark_for_delete | BOOL |  | ✅ | 0 |
| editable | BOOL |  | ✅ | 1 |
| display | TEXT |  | ✅ | '{}' |
| is_multiple | BOOL |  | ✅ | 0 |
| normalized | BOOL |  | ✅ |  |

**索引列表 (2个):**

- custom_columns_idx (label)
- sqlite_autoindex_custom_columns_1 (label)

#### data

**SQL定义:**
```sql
CREATE TABLE data ( id     INTEGER PRIMARY KEY,
                            book   INTEGER NOT NULL,
                            format TEXT NOT NULL COLLATE NOCASE,
                            uncompressed_size INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            UNIQUE(book, format)
)
```

**字段列表 (5个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| format | TEXT |  | ✅ |  |
| uncompressed_size | INTEGER |  | ✅ |  |
| name | TEXT |  | ✅ |  |

**索引列表 (3个):**

- formats_idx (format)
- data_idx (book)
- sqlite_autoindex_data_1 (book, format)

#### feeds

**SQL定义:**
```sql
CREATE TABLE feeds ( id   INTEGER PRIMARY KEY,
                              title TEXT NOT NULL,
                              script TEXT NOT NULL,
                              UNIQUE(title)
                             )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| title | TEXT |  | ✅ |  |
| script | TEXT |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_feeds_1 (title)

#### identifiers

**SQL定义:**
```sql
CREATE TABLE identifiers  ( id     INTEGER PRIMARY KEY,
                                    book   INTEGER NOT NULL,
                                    type   TEXT NOT NULL DEFAULT 'isbn' COLLATE NOCASE,
                                    val    TEXT NOT NULL COLLATE NOCASE,
                                    UNIQUE(book, type)
        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| type | TEXT |  | ✅ | 'isbn' |
| val | TEXT |  | ✅ |  |

**索引列表 (2个):**

- identifiers_book_type_val_idx (book, type, val)
- sqlite_autoindex_identifiers_1 (book, type)

#### languages

**SQL定义:**
```sql
CREATE TABLE languages    ( id        INTEGER PRIMARY KEY,
                                    lang_code TEXT NOT NULL COLLATE NOCASE,
							        link TEXT NOT NULL DEFAULT '',
                                    UNIQUE(lang_code)
        )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| lang_code | TEXT |  | ✅ |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (2个):**

- languages_idx (lang_code)
- sqlite_autoindex_languages_1 (lang_code)

#### last_read_positions

**SQL定义:**
```sql
CREATE TABLE last_read_positions ( id INTEGER PRIMARY KEY,
	book INTEGER NOT NULL,
	format TEXT NOT NULL COLLATE NOCASE,
	user TEXT NOT NULL,
	device TEXT NOT NULL,
	cfi TEXT NOT NULL,
	epoch REAL NOT NULL,
	pos_frac REAL NOT NULL DEFAULT 0,
	UNIQUE(user, device, book, format)
)
```

**字段列表 (8个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |
| format | TEXT |  | ✅ |  |
| user | TEXT |  | ✅ |  |
| device | TEXT |  | ✅ |  |
| cfi | TEXT |  | ✅ |  |
| epoch | REAL |  | ✅ |  |
| pos_frac | REAL |  | ✅ | 0 |

**索引列表 (2个):**

- lrp_idx (book)
- sqlite_autoindex_last_read_positions_1 (user, device, book, format)

#### library_id

**SQL定义:**
```sql
CREATE TABLE library_id ( id   INTEGER PRIMARY KEY,
                                  uuid TEXT NOT NULL,
                                  UNIQUE(uuid)
        )
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| uuid | TEXT |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_library_id_1 (uuid)

#### metadata_dirtied

**SQL定义:**
```sql
CREATE TABLE metadata_dirtied(id INTEGER PRIMARY KEY,
                             book INTEGER NOT NULL,
                             UNIQUE(book))
```

**字段列表 (2个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book | INTEGER |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_metadata_dirtied_1 (book)

#### preferences

**SQL定义:**
```sql
CREATE TABLE preferences(id INTEGER PRIMARY KEY,
                                 key TEXT NOT NULL,
                                 val TEXT NOT NULL,
                                 UNIQUE(key))
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| key | TEXT |  | ✅ |  |
| val | TEXT |  | ✅ |  |

**索引列表 (1个):**

- sqlite_autoindex_preferences_1 (key)

#### publishers

**SQL定义:**
```sql
CREATE TABLE publishers ( id   INTEGER PRIMARY KEY,
                                  name TEXT NOT NULL COLLATE NOCASE,
                                  sort TEXT COLLATE NOCASE,
								  link TEXT NOT NULL DEFAULT '',
                                  UNIQUE(name)
                             )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| sort | TEXT |  |  |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (2个):**

- publishers_idx (name)
- sqlite_autoindex_publishers_1 (name)

#### ratings

**SQL定义:**
```sql
CREATE TABLE "ratings" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rating REAL NOT NULL,
        link TEXT NOT NULL DEFAULT '',
        UNIQUE (rating)
      )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| rating | REAL |  | ✅ |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (1个):**

- sqlite_autoindex_ratings_1 (rating)

#### series

**SQL定义:**
```sql
CREATE TABLE series ( id   INTEGER PRIMARY KEY,
                              name TEXT NOT NULL COLLATE NOCASE,
                              sort TEXT COLLATE NOCASE,
							  link TEXT NOT NULL DEFAULT '',
                              UNIQUE (name)
                             )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| sort | TEXT |  |  |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (2个):**

- series_idx (name)
- sqlite_autoindex_series_1 (name)

#### tags

**SQL定义:**
```sql
CREATE TABLE tags ( id   INTEGER PRIMARY KEY,
                            name TEXT NOT NULL COLLATE NOCASE,
							link TEXT NOT NULL DEFAULT '',
                            UNIQUE (name)
                             )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| link | TEXT |  | ✅ | '' |

**索引列表 (2个):**

- tags_idx (name)
- sqlite_autoindex_tags_1 (name)

## Talebook 数据库 (calibre-webserver.db)

### 表统计

总表数: 26

### 表结构详情

#### _items_old_20260203

**SQL定义:**
```sql
CREATE TABLE "_items_old_20260203" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_type INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            cover TEXT,
            description TEXT,
            pubdate TEXT,
            publisher TEXT,
            isbn TEXT,
            language TEXT,
            series TEXT,
            series_index REAL,
            path TEXT NOT NULL,
            uuid TEXT NOT NULL,
            added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (16个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book_type | INTEGER |  |  | 1 |
| title | TEXT |  | ✅ |  |
| author | TEXT |  | ✅ |  |
| cover | TEXT |  |  |  |
| description | TEXT |  |  |  |
| pubdate | TEXT |  |  |  |
| publisher | TEXT |  |  |  |
| isbn | TEXT |  |  |  |
| language | TEXT |  |  |  |
| series | TEXT |  |  |  |
| series_index | REAL |  |  |  |
| path | TEXT |  | ✅ |  |
| uuid | TEXT |  | ✅ |  |
| added | TIMESTAMP |  |  | CURRENT_TIMESTAMP |
| last_modified | TIMESTAMP |  |  | CURRENT_TIMESTAMP |

#### biz_key

**SQL定义:**
```sql
CREATE TABLE biz_key (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reader_id INTEGER,
                key VARCHAR(100),
                expire DATETIME,
                create_time DATETIME,
                type INTEGER
            )
```

**字段列表 (6个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| reader_id | INTEGER |  |  |  |
| key | VARCHAR(100) |  |  |  |
| expire | DATETIME |  |  |  |
| create_time | DATETIME |  |  |  |
| type | INTEGER |  |  |  |

#### comments

**SQL定义:**
```sql
CREATE TABLE comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER,
          content TEXT,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| item_id | INTEGER |  |  |  |
| content | TEXT |  |  |  |
| created | TIMESTAMP |  |  | CURRENT_TIMESTAMP |

#### items

**SQL定义:**
```sql
CREATE TABLE "items" (
      book_id INTEGER NOT NULL PRIMARY KEY,
      count_guest INTEGER NOT NULL DEFAULT 0,
      count_visit INTEGER NOT NULL DEFAULT 0,
      count_download INTEGER NOT NULL DEFAULT 0,
      website VARCHAR(255) NOT NULL DEFAULT '',
      collector_id INTEGER DEFAULT 0,
      sole BOOLEAN NOT NULL DEFAULT 0,
      book_type INTEGER NOT NULL DEFAULT 1,
      book_count INTEGER NOT NULL DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
```

**字段列表 (10个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| book_id | INTEGER | ✅ | ✅ |  |
| count_guest | INTEGER |  | ✅ | 0 |
| count_visit | INTEGER |  | ✅ | 0 |
| count_download | INTEGER |  | ✅ | 0 |
| website | VARCHAR(255) |  | ✅ | '' |
| collector_id | INTEGER |  |  | 0 |
| sole | BOOLEAN |  | ✅ | 0 |
| book_type | INTEGER |  | ✅ | 1 |
| book_count | INTEGER |  | ✅ | 0 |
| create_time | DATETIME |  |  | CURRENT_TIMESTAMP |

#### messages

**SQL定义:**
```sql
CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(200),
                status VARCHAR(100),
                unread BOOLEAN,
                create_time DATETIME,
                update_time DATETIME,
                data TEXT,
                reader_id INTEGER
            )
```

**字段列表 (8个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| title | VARCHAR(200) |  |  |  |
| status | VARCHAR(100) |  |  |  |
| unread | BOOLEAN |  |  |  |
| create_time | DATETIME |  |  |  |
| update_time | DATETIME |  |  |  |
| data | TEXT |  |  |  |
| reader_id | INTEGER |  |  |  |

#### qc_book_groups

**SQL定义:**
```sql
CREATE TABLE qc_book_groups (
      id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE ON UPDATE NO ACTION
    )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book_id | INTEGER |  | ✅ |  |
| group_id | INTEGER |  | ✅ |  |

**外键约束 (2个):**

- book_id → items.book_id (更新: NO ACTION, 删除: CASCADE)
- group_id → qc_groups.id (更新: NO ACTION, 删除: CASCADE)

#### qc_book_tags

**SQL定义:**
```sql
CREATE TABLE qc_book_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      tag_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE,
      UNIQUE(book_id, tag_name)
    )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book_id | INTEGER |  | ✅ |  |
| tag_name | TEXT |  | ✅ |  |
| created_at | TEXT |  |  | CURRENT_TIMESTAMP |

**索引列表 (3个):**

- idx_qc_book_tags_tag_name (tag_name)
- idx_qc_book_tags_book_id (book_id)
- sqlite_autoindex_qc_book_tags_1 (book_id, tag_name)

**外键约束 (1个):**

- book_id → items.book_id (更新: NO ACTION, 删除: CASCADE)

#### qc_bookdata

**SQL定义:**
```sql
CREATE TABLE "qc_bookdata" (
      "book_id" INTEGER,
      "page_count" INTEGER DEFAULT 0,
      "standard_price" REAL DEFAULT 0,
      "purchase_price" REAL DEFAULT 0,
      "purchase_date" TEXT,
      "binding1" INTEGER DEFAULT 0,
      "binding2" INTEGER DEFAULT 0,
      "note" TEXT,
      "total_reading_time" INTEGER DEFAULT 0,
      "read_pages" INTEGER DEFAULT 0,
      "reading_count" INTEGER DEFAULT 0,
      "last_read_date" DATE DEFAULT NULL,
      "last_read_duration" INTEGER DEFAULT 0, paper1 INTEGER DEFAULT 0, edge1 INTEGER DEFAULT 0, edge2 INTEGER DEFAULT 0,
      PRIMARY KEY ("book_id"),
      FOREIGN KEY ("book_id") REFERENCES "items" ("book_id") ON DELETE CASCADE ON UPDATE CASCADE
    )
```

**字段列表 (16个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| book_id | INTEGER | ✅ |  |  |
| page_count | INTEGER |  |  | 0 |
| standard_price | REAL |  |  | 0 |
| purchase_price | REAL |  |  | 0 |
| purchase_date | TEXT |  |  |  |
| binding1 | INTEGER |  |  | 0 |
| binding2 | INTEGER |  |  | 0 |
| note | TEXT |  |  |  |
| total_reading_time | INTEGER |  |  | 0 |
| read_pages | INTEGER |  |  | 0 |
| reading_count | INTEGER |  |  | 0 |
| last_read_date | DATE |  |  | NULL |
| last_read_duration | INTEGER |  |  | 0 |
| paper1 | INTEGER |  |  | 0 |
| edge1 | INTEGER |  |  | 0 |
| edge2 | INTEGER |  |  | 0 |

**外键约束 (1个):**

- book_id → items.book_id (更新: CASCADE, 删除: CASCADE)

#### qc_bookmark_tags

**SQL定义:**
```sql
CREATE TABLE qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER,
          tag_id INTEGER,
          tag_name TEXT
        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| bookmark_id | INTEGER |  |  |  |
| tag_id | INTEGER |  |  |  |
| tag_name | TEXT |  |  |  |

#### qc_bookmarks

**SQL定义:**
```sql
CREATE TABLE qc_bookmarks (
      id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        book_title TEXT,
        book_author TEXT,
        content TEXT NOT NULL,
        note TEXT,
        page INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE ON UPDATE NO ACTION
    )
```

**字段列表 (9个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book_id | INTEGER |  | ✅ |  |
| book_title | TEXT |  |  |  |
| book_author | TEXT |  |  |  |
| content | TEXT |  | ✅ |  |
| note | TEXT |  |  |  |
| page | INTEGER |  |  |  |
| created_at | TEXT |  |  | CURRENT_TIMESTAMP |
| updated_at | TEXT |  |  | CURRENT_TIMESTAMP |

**外键约束 (1个):**

- book_id → items.book_id (更新: NO ACTION, 删除: CASCADE)

#### qc_daily_reading_stats

**SQL定义:**
```sql
CREATE TABLE qc_daily_reading_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL,
          date DATE NOT NULL,
          total_books INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, date)
        )
```

**字段列表 (8个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| reader_id | INTEGER |  | ✅ |  |
| date | DATE |  | ✅ |  |
| total_books | INTEGER |  |  | 0 |
| total_pages | INTEGER |  |  | 0 |
| total_time | INTEGER |  |  | 0 |
| created_at | DATETIME |  |  | CURRENT_TIMESTAMP |
| updated_at | DATETIME |  |  | CURRENT_TIMESTAMP |

**索引列表 (2个):**

- idx_daily_stats_reader_date (reader_id, date)
- sqlite_autoindex_qc_daily_reading_stats_1 (reader_id, date)

#### qc_groups

**SQL定义:**
```sql
CREATE TABLE qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (5个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| description | TEXT |  |  |  |
| created_at | TEXT |  |  | CURRENT_TIMESTAMP |
| updated_at | TEXT |  |  | CURRENT_TIMESTAMP |

#### qc_reading_records

**SQL定义:**
```sql
CREATE TABLE qc_reading_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          duration INTEGER NOT NULL,
          start_page INTEGER NOT NULL DEFAULT 0,
          end_page INTEGER NOT NULL DEFAULT 0,
          pages_read INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (11个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| book_id | INTEGER |  | ✅ |  |
| reader_id | INTEGER |  | ✅ |  |
| start_time | DATETIME |  | ✅ |  |
| end_time | DATETIME |  | ✅ |  |
| duration | INTEGER |  | ✅ |  |
| start_page | INTEGER |  | ✅ | 0 |
| end_page | INTEGER |  | ✅ | 0 |
| pages_read | INTEGER |  | ✅ | 0 |
| notes | TEXT |  |  |  |
| created_at | DATETIME |  |  | CURRENT_TIMESTAMP |

**索引列表 (3个):**

- idx_reading_reader_date (reader_id, start_time)
- idx_reading_date (start_time)
- idx_reading_book_reader (book_id, reader_id)

#### qc_tags

**SQL定义:**
```sql
CREATE TABLE qc_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| name | TEXT |  | ✅ |  |
| created_at | TEXT |  |  | CURRENT_TIMESTAMP |
| updated_at | TEXT |  |  | CURRENT_TIMESTAMP |

#### reader_paid_books

**SQL定义:**
```sql
CREATE TABLE reader_paid_books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reader_id INTEGER,
                book_id INTEGER,
                order_id VARCHAR(100),
                create_time DATETIME,
                price INTEGER
            )
```

**字段列表 (6个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| reader_id | INTEGER |  |  |  |
| book_id | INTEGER |  |  |  |
| order_id | VARCHAR(100) |  |  |  |
| create_time | DATETIME |  |  |  |
| price | INTEGER |  |  |  |

#### readerlogs

**SQL定义:**
```sql
CREATE TABLE readerlogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reader_id INTEGER,
                action INTEGER,
                create_time DATETIME,
                extra TEXT,
                revision VARCHAR(100),
                operator_id INTEGER
            )
```

**字段列表 (7个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| reader_id | INTEGER |  |  |  |
| action | INTEGER |  |  |  |
| create_time | DATETIME |  |  |  |
| extra | TEXT |  |  |  |
| revision | VARCHAR(100) |  |  |  |
| operator_id | INTEGER |  |  |  |

#### readers

**SQL定义:**
```sql
CREATE TABLE readers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(200),
                password VARCHAR(200),
                salt VARCHAR(200),
                name VARCHAR(100),
                email VARCHAR(200),
                avatar VARCHAR(200),
                admin BOOLEAN,
                active BOOLEAN,
                permission VARCHAR(100),
                create_time DATETIME,
                update_time DATETIME,
                access_time DATETIME,
                extra TEXT,
                vipquota INTEGER,
                vipexpire DATETIME
            )
```

**字段列表 (16个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| username | VARCHAR(200) |  |  |  |
| password | VARCHAR(200) |  |  |  |
| salt | VARCHAR(200) |  |  |  |
| name | VARCHAR(100) |  |  |  |
| email | VARCHAR(200) |  |  |  |
| avatar | VARCHAR(200) |  |  |  |
| admin | BOOLEAN |  |  |  |
| active | BOOLEAN |  |  |  |
| permission | VARCHAR(100) |  |  |  |
| create_time | DATETIME |  |  |  |
| update_time | DATETIME |  |  |  |
| access_time | DATETIME |  |  |  |
| extra | TEXT |  |  |  |
| vipquota | INTEGER |  |  |  |
| vipexpire | DATETIME |  |  |  |

#### reading_goals

**SQL定义:**
```sql
CREATE TABLE reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          target INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, year)
        )
```

**字段列表 (7个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| reader_id | INTEGER |  | ✅ | 0 |
| year | INTEGER |  | ✅ |  |
| target | INTEGER |  | ✅ |  |
| completed | INTEGER |  |  | 0 |
| created_at | TEXT |  |  | CURRENT_TIMESTAMP |
| updated_at | TEXT |  |  | CURRENT_TIMESTAMP |

**索引列表 (1个):**

- sqlite_autoindex_reading_goals_1 (reader_id, year)

#### reading_state

**SQL定义:**
```sql
CREATE TABLE reading_state (
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          favorite_date TEXT,
          wants INTEGER DEFAULT 0,
          wants_date TEXT,
          read_state INTEGER DEFAULT 0,
          read_date TEXT,
          online_read INTEGER DEFAULT 0,
          download INTEGER DEFAULT 0,
          PRIMARY KEY (book_id, reader_id)
        )
```

**字段列表 (10个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| book_id | INTEGER | ✅ | ✅ |  |
| reader_id | INTEGER | ✅ | ✅ | 0 |
| favorite | INTEGER |  |  | 0 |
| favorite_date | TEXT |  |  |  |
| wants | INTEGER |  |  | 0 |
| wants_date | TEXT |  |  |  |
| read_state | INTEGER |  |  | 0 |
| read_date | TEXT |  |  |  |
| online_read | INTEGER |  |  | 0 |
| download | INTEGER |  |  | 0 |

**索引列表 (1个):**

- sqlite_autoindex_reading_state_1 (book_id, reader_id)

#### scanfiles

**SQL定义:**
```sql
CREATE TABLE scanfiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id INTEGER,
                import_id INTEGER,
                name VARCHAR(512),
                path VARCHAR(1024),
                hash VARCHAR(512),
                status VARCHAR(24),
                title VARCHAR(100),
                author VARCHAR(100),
                publisher VARCHAR(100),
                tags VARCHAR(100),
                create_time DATETIME,
                update_time DATETIME,
                book_id INTEGER,
                data TEXT
            )
```

**字段列表 (15个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| scan_id | INTEGER |  |  |  |
| import_id | INTEGER |  |  |  |
| name | VARCHAR(512) |  |  |  |
| path | VARCHAR(1024) |  |  |  |
| hash | VARCHAR(512) |  |  |  |
| status | VARCHAR(24) |  |  |  |
| title | VARCHAR(100) |  |  |  |
| author | VARCHAR(100) |  |  |  |
| publisher | VARCHAR(100) |  |  |  |
| tags | VARCHAR(100) |  |  |  |
| create_time | DATETIME |  |  |  |
| update_time | DATETIME |  |  |  |
| book_id | INTEGER |  |  |  |
| data | TEXT |  |  |  |

#### social_auth_association

**SQL定义:**
```sql
CREATE TABLE social_auth_association (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_url VARCHAR(255),
                handle VARCHAR(255),
                secret VARCHAR(255),
                issued INTEGER,
                lifetime INTEGER,
                assoc_type VARCHAR(64)
            )
```

**字段列表 (7个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| server_url | VARCHAR(255) |  |  |  |
| handle | VARCHAR(255) |  |  |  |
| secret | VARCHAR(255) |  |  |  |
| issued | INTEGER |  |  |  |
| lifetime | INTEGER |  |  |  |
| assoc_type | VARCHAR(64) |  |  |  |

#### social_auth_code

**SQL定义:**
```sql
CREATE TABLE social_auth_code (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(200),
                code VARCHAR(32)
            )
```

**字段列表 (3个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| email | VARCHAR(200) |  |  |  |
| code | VARCHAR(32) |  |  |  |

#### social_auth_nonce

**SQL定义:**
```sql
CREATE TABLE social_auth_nonce (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_url VARCHAR(255),
                timestamp INTEGER,
                salt VARCHAR(40)
            )
```

**字段列表 (4个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| server_url | VARCHAR(255) |  |  |  |
| timestamp | INTEGER |  |  |  |
| salt | VARCHAR(40) |  |  |  |

#### social_auth_partial

**SQL定义:**
```sql
CREATE TABLE social_auth_partial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token VARCHAR(32),
                data TEXT,
                next_step INTEGER,
                backend VARCHAR(32)
            )
```

**字段列表 (5个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| token | VARCHAR(32) |  |  |  |
| data | TEXT |  |  |  |
| next_step | INTEGER |  |  |  |
| backend | VARCHAR(32) |  |  |  |

#### social_auth_usersocialauth

**SQL定义:**
```sql
CREATE TABLE social_auth_usersocialauth (
                uid VARCHAR(255),
                user_id INTEGER NOT NULL,
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider VARCHAR(32),
                extra_data TEXT
            )
```

**字段列表 (5个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| uid | VARCHAR(255) |  |  |  |
| user_id | INTEGER |  | ✅ |  |
| id | INTEGER | ✅ |  |  |
| provider | VARCHAR(32) |  |  |  |
| extra_data | TEXT |  |  |  |

#### users

**SQL定义:**
```sql
CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT UNIQUE,
          avatar TEXT,
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

**字段列表 (8个):**

| 字段名 | 类型 | 主键 | 非空 | 默认值 |
|---------|------|------|------|--------|
| id | INTEGER | ✅ |  |  |
| username | TEXT |  | ✅ |  |
| name | TEXT |  |  |  |
| email | TEXT |  |  |  |
| avatar | TEXT |  |  |  |
| admin | INTEGER |  |  | 0 |
| active | INTEGER |  |  | 1 |
| created_at | DATETIME |  |  | CURRENT_TIMESTAMP |

**索引列表 (2个):**

- sqlite_autoindex_users_2 (email)
- sqlite_autoindex_users_1 (username)

## 数据库表间关系

### Calibre 数据库关系

✅ books ↔ authors (通过 books_authors_link)
✅ books ↔ publishers (通过 books_publishers_link)
✅ books ↔ tags (通过 books_tags_link)
✅ books ↔ ratings (通过 books_ratings_link)
✅ books ↔ languages (通过 books_languages_link)
✅ books ↔ series (通过 books_series_link)
✅ books ↔ identifiers (通过 identifiers (book))
✅ books ↔ comments (通过 comments (book))

### Talebook 数据库关系

✅ items ↔ users (通过 collector_id)
✅ qc_bookdata ↔ items (通过 book_id)
✅ reading_state ↔ items (通过 book_id)
✅ reading_state ↔ users (通过 reader_id)
✅ qc_bookmarks ↔ items (通过 book_id)
✅ qc_bookmarks ↔ qc_bookmark_tags (通过 bookmark_id)
✅ qc_book_groups ↔ qc_groups (通过 group_id)
✅ qc_book_groups ↔ items (通过 book_id)
