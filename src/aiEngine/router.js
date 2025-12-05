// src/aiEngine/router.js
import express from "express";

// Simple intent & section detectors (inline for reliability)
function detectIntent(text) {
  text = (text || "").toLowerCase();
  // First priority → if user asks about drawing lines
  if (
    text.includes("line") ||
    text.includes("draw line") ||
    text.includes("horizontal") ||
    text.includes("vline")
  ) {
    return "LINE_HELP";
  }

  if (
    text.includes("generate") ||
    text.includes("create view") ||
    text.includes("make view") ||
    text.includes("generate view")
  )
    return "SQL_GEN";
  if (
    text.startsWith("what") ||
    text.startsWith("how") ||
    text.includes("explain") ||
    text.includes("format") ||
    text.includes("mandatory") ||
    text.includes("structure")
  )
    return "EXPLAIN";
  if (text.includes("example")) return "EXAMPLE";
  return "SEARCH";
}

function detectSection(text) {
  text = (text || "").toLowerCase();
  if (text.includes("pageheader")) return "pageheader";
  if (text.includes("companyheader")) return "companyheader";
  if (text.includes("details")) return "details";
  if (text.includes("reportfooter") || text.includes("footer"))
    return "reportfooter";
  if (text.includes("line")) return "lines";
  if (text.includes("sabrep_topleft") || text.includes("sabrep"))
    return "sabrep_topleft";
  return null;
}

// Lightweight templates and SQL generators (expandable)
function pageheaderExplain() {
  return `📘 **PageHeader View Explanation**

A PageHeader view is used for top-level fields like:
- EntNo
- EntDt
- Party details
- Horizontal line (line1)

------------------------------------------------------------
🔷 **Mandatory Columns**
------------------------------------------------------------
### Mendatory column in this view is:colname ,bname,sabid
  a)colname:used for understand what kind of data for a developer  also usedcase 
  for connectivity design alignment location in the table sabrep_topleft.
Note:Later will explain
  b)bname: this bname value will be seen as a output in the Report.
  c)sabid:connectivity in report which record want to show at a time.
  
  This section Defines in the Page Top container declared after companyheader
   pageheader in which we mentioned debtor party  details and invoice no and date if they required in report:
 view name: sabrep_pageheader_?regcode)
   Note: ?regcode) means its dyanmic repcode that particular report which is mentioned in the sdl File repcode=xyz.so its mean (sabrep_pageheader_xyz)
 - **colname** → binds to sabrep_topleft.colname  
- **bname** → printed value / keyword  
- **sabid** → identifies which record to print  

Meaning:
- colname must match sabrep_topleft.colname  
- bname appears as output unless it is a keyword  
- sabid ensures only selected entry is printed  

------------------------------------------------------------
🔷 **View Naming Rule**
sabrep_pageheader_<regcode>

Example:
- sabrep_pageheader_chlf
- sabrep_pageheader_inwe
------------------------------------------------------------
🔷 **Special Keywords (Used inside bname)**
- **!heading** → prints a formatted heading  
- **line**     → draws a horizontal line  
- **vline**    → draws a vertical line  
  A1)!Heading: This is key will be used in the section for Dynamic store that Heading.

  A2)line: This keyword is reserved in the software for used case make a line in Horizontal Format.
   
  A3)vline: This keyword is reserved in the software for used case make a line in Vertical  Format.

  
These keywords generate layout elements instead of text.

------------------------------------------------------------
🔷 **Common Attributes (Used in section pageheader in the table sabrep_topleft_Box)**
- ttop      → top margin  
- tleft     → left margin  
- width     → container width  
- height    → container height  
* line_left: Container border line show in the left side
* line_right: Container border line show in the right side
* line_bottom: Container border line show in the bottom side
* line_up : Container border line show in the up side
* line_height: Container border height show in the top and bottom side and width for left and right side all four side line effect there size.
* caption: caption show for value label
* colname: colname exact same in the mentioned of view sabrep_pageheader_?regcode). its dynamic regcode which report is mentioned.

Notes:
- Used for branding and identity  
- Must match sabrep_topleft.colname  
- regcode dynamically selects the view  

------------------------------------------------------------
🔷 **Example View (pageheader_chlf)**
------------------------------------------------------------

\`\`\`sql
CREATE VIEW sabrep_pageheader_chlf AS             
SELECT 'Entno' AS colname, a.sabid, a.entno AS bname 
FROM tablename a             
UNION ALL            
SELECT 'Entdt', a.sabid, CONVERT(nvarchar, a.entdt, 110) AS bname 
FROM tablename a            
UNION ALL            
SELECT 'line1', a.sabid, 'line' AS bname 
FROM tablename a;
\`\`\`


------------------------------------------------------------
🔷 Understanding Mandatory Columns

1) colname  
   - Used for design alignment  
   - Must match sabrep_topleft.colname exactly

2) bname  
   - Visible output OR keyword (line / vline / !heading)

3) comp  
   - Identifies which company record to pull  

------------------------------------------------------------
🔷 **sabrep_topleft (Design Table) — Key Fields**
------------------------------------------------------------

- repcode     → report identifier  
- section     → companyheader  (companyheader section for the top page show the company details)
(This section column also important to define in which section mentioned the design and the value show in that particular section and the section name First defined in the table sabrep_topleft_box in section column)
- ttop        → starting Y position  (top left corner start)
- tleft       → starting X position  (page left side start)
- height      → value height  
- width       → value width  
- fontsize    → value fontsize
- fontname    → value fontname
- line_height → height of the value space cover.
- bold        → value will be bold.
- align       → value start from the left/right/centre this three option.

Note:Suppose if width value is 0 then its worked in centre value show because the backend works format.
and tleft value will be disabled until width value more than 0 value.

🧩 Naming Rule:
sabrep_pageheader_<repcode>
**Note:**  
If width = 0 → value is auto-centered.  

------------------------------------------------------------
🧱 **Auto Template**
\`\`\`sql
CREATE VIEW sabrep_pageheader_<repcode> AS
SELECT 'Entno' AS colname, a.sabid, a.entno AS bname
FROM <tablename> a
UNION ALL
SELECT 'Entdt', a.sabid, CONVERT(nvarchar, a.entdt, 110) AS bname
FROM <tablename> a
UNION ALL
SELECT 'line1', a.sabid, 'line' AS bname
FROM <tablename> a;
\`\`\`
`;
}

function pageheaderExample() {
  return `Example view name: sabrep_pageheader_gtnx
Make sure sabrep_topleft.colname values match the colname entries in this view.`;
}

function companyheaderExplain() {
  return `🏢 CompanyHeader View Explanation

The CompanyHeader section is used to display company-level information such as:
- Company Name
- Address
- Heading text
- Horizontal / Vertical lines

This section appears at the **top of the first page** unless configured to repeat.

------------------------------------------------------------
🔷 View Naming Rule
sabrep_companyheader_<regcode>

Example:
sabrep_companyheader_chlf
sabrep_companyheader_inwe
------------------------------------------------------------

🔷 Mandatory Columns
- colname → used to connect sabrep_topleft.colname  
- bname   → printed text / keyword (line, vline, !heading)  
- comp    → used to fetch company-level values  

------------------------------------------------------------
🔷 Special Keywords (Used inside bname)
- !heading → prints a formatted heading  
- line     → draws a horizontal line  
- vline    → draws a vertical line  
  A1)!Heading: This is key will be used in the section for Dynamic store that Heading.

  A2)line: This keyword is reserved in the software for used case make a line in Horizontal Format.
   
  A3)vline: This keyword is reserved in the software for used case make a line in Vertical  Format.

These keywords generate layout elements instead of text.

------------------------------------------------------------
🔷 Common Attributes (Used in section companyheader in the table sabrep_topleft_Box)
- ttop      → top margin  
- tleft     → left margin  
- width     → container width  
- height    → container height  

Notes:
- Used for branding and identity  
- Must match sabrep_topleft.colname  
- regcode dynamically selects the view  

------------------------------------------------------------
🔷 Example View (companyheader_chlf)

CREATE VIEW sabrep_companyheader_chlf AS
SELECT 'compname' AS colname, 'Transport Pass' AS bname, a.pid AS comp
FROM sabcompany a
UNION ALL
SELECT 'compadr', 'Collector Palghar (Supply Dept)', a.pid
FROM sabcompany a
UNION ALL
SELECT 'line1', 'line', a.pid
FROM sabcompany a
UNION ALL
SELECT 'heading', '!heading', a.pid
FROM sabcompany a;

------------------------------------------------------------
🔷 Understanding Mandatory Columns

1) colname  
   - Used for design alignment  
   - Must match sabrep_topleft.colname exactly

2) bname  
   - Visible output OR keyword (line / vline / !heading)

3) comp  
   - Identifies which company record to pull  

------------------------------------------------------------
🔷 sabrep_topleft (Design Table) — Key Fields

- repcode     → report identifier  
- section     → companyheader  (companyheader section for the top page show the company details)
(This section column also important to define in which section mentioned the design and the value show in that particular section and the section name First defined in the table sabrep_topleft_box in section column)
- ttop        → starting Y position  (top left corner start)
- tleft       → starting X position  (page left side start)
- height      → value height  
- width       → value width  
- fontsize    → value fontsize
- fontname    → value fontname
- line_height → height of the value space cover.
- bold        → value will be bold.
- align       → value start from the left/right/centre this three option.

Note:Suppose if width value is 0 then its worked in centre value show because the backend works format.
and tleft value will be disabled until width value more than 0 value.


These define where and how the section prints on the page.
------------------------------------------------------------
`;
}

function detailsExplain() {
  return `📘 Details View Explanation
**details**: This section Defines in the Page mid container declared
   * This view represents the DETAILS SECTION of your report.
In ERP reporting, the Details section is where all line-items or transaction rows appear.
   * This view supplies the exact data the report engine will repeat for every row in the “details” grid.
   *  Why this View Exists? (Core Purpose)
       ##
		*  sabrep_details_chlf is a data provider for the DETAILS section of the report with regcode = chlf
        *  Your report engine follows a strict rule:
        *  For every section in a report, a view must exist whose name is: sabrep_?section)_?regcode)
        *  So for:
        * Section: details
		* Repcode: chlf
		* The engine automatically expects this view:		=> sabrep_details_chlf
		➤ This view provides ALL the transaction rows that the “Details” part of the report should print.
CREATE VIEW sabrep_details_chlf AS
SELECT  
    a.sabid,
    a.sno,
    asab9_a.person AS party,
    asab9_a.pdukanno,
    a.permit
FROM bsab_trkchl_mid a 
LEFT JOIN asab9 AS asab9_a ON a.party = asab9_a.pid;
### Mendatory column in this view is:colname ,bname,sabid
  * a) colname:used for understand what kind of data for a developer understand also usedcase for connectivity design alignment location in the table sabrep_topleft.
Note:Later will explain
  * b) bname: this bname value will be seen as a output in the Report.
 * c) sabid:connectivity in report which record want to show at a time
    * (sabid is the master key that tells your report engine which specific record is being printed.).
  * Your engine always passes something like:

  WHERE sabid = ?sabid)
***Note : ?columnname) it means current form any column values passed from that current open form.
So only the rows belonging to this specific report entry print.***

**sabrep_topleft table=>column wise explaination below:**
* repcode: repcode of the report
* section: pageheader section for the top page show the party or coustomer details.
* ttop   : not work in details
* tleft  : nor work in details
* height : height of the cell 
* width  : width of the cell 
* line_left: not work in details
* line_right: not work in details
* line_bottom: not work in details
* line_up : not work in details
* line_height: not work in details
* caption: not work in details
* colname: colname exact same in the mentioned of view
 sabrep_details_?Repcode). its dynamic regcode which report is mentioned.  
 When Does the View Execute? (Runtime Flow)
When user clicks PRINT REPORT:

1) Report engine loads sabtopleft_report_up → gets sabid

2) Engine loads section metadata from:

  * sabrep_topleft

  * sabrep_topleft_Box

3) Then it finds this view:

  * sabrep_details_chlf

4) Engine executes:

➤ SELECT * FROM sabrep_details_chlf WHERE sabid = ?sabid)

5) For each row returned → engine prints one detail row
   ➤ If 10 rows returned → 10 lines print in the Details Section
   ➤ If 0 rows returned → Details section prints empty

6) Why Only These Columns?

Because these are the columns your report design refers to.

In sabrep_topleft, you will have rows like:
| section | colname  | caption  |
| ------- | -------- | -------- |
| details | sno      | Sr.No    |
| details | party    | Party    |
| details | pdukanno | Dukan No |
| details | permit   | Permit   |

Meaning:

Whatever colname is used in design must exist in this view

If design has a column missing from this view → report shows blank
`;
}

// SQL generators
function generatePageheaderSQL(repcode, table) {
  if (!repcode || !table) return null;
  return `CREATE VIEW sabrep_pageheader_${repcode} AS
SELECT 'Entno' AS colname, a.sabid AS sabid, a.entno AS bname
FROM ${table} a
UNION ALL
SELECT 'Entdt', a.sabid, CONVERT(nvarchar, a.entdt, 110) AS bname
FROM ${table} a
UNION ALL
SELECT 'line1', a.sabid, 'line' AS bname
FROM ${table} a;`;
}

function generateCompanyheaderSQL(repcode, table) {
  if (!repcode || !table) return null;
  return `CREATE VIEW sabrep_companyheader_${repcode} AS
SELECT 'compname' AS colname, a.compname AS bname, a.pid AS comp FROM ${table} a
UNION ALL
SELECT 'compadr', a.address AS bname, a.pid FROM ${table} a
UNION ALL
SELECT 'line1', a.pid, 'line' AS bname FROM ${table} a;`;
}

const router = express.Router();

// POST /ai/ask
router.post("/ask", express.json(), (req, res) => {
  const textRaw = (req.body && req.body.text) || "";
  const text = textRaw.trim();

  if (!text) return res.status(400).json({ error: "empty text" });

  const intent = detectIntent(text);
  const section = detectSection(text);

  // EXPLAIN INTENT
  if (intent === "EXPLAIN") {
    if (section === "pageheader")
      return res.json({ mode: "EXPLAIN", answer: pageheaderExplain() });
    if (section === "companyheader")
      return res.json({ mode: "EXPLAIN", answer: companyheaderExplain() });
    if (section === "details")
      return res.json({ mode: "EXPLAIN", answer: detailsExplain() });
    // generic fallback explain
    return res.json({
      mode: "EXPLAIN",
      answer: `I can explain pageheader, companyheader, details, reportfooter. Try: "what is pageheader view format?"`,
    });
  }

  // EXAMPLE INTENT
  if (intent === "EXAMPLE") {
    if (section === "pageheader")
      return res.json({ mode: "EXAMPLE", answer: pageheaderExample() });
    return res.json({
      mode: "EXAMPLE",
      answer: "Ask for an example of pageheader, companyheader, or details.",
    });
  }

  // SQL generation
  if (intent === "SQL_GEN") {
    // robust table/recode extraction patterns
    let repcode =
      text.match(/repcode\s*[:=]?\s*([a-z0-9_]+)/i)?.[1] ||
      text.match(/repcode\s+([a-z0-9_]+)/i)?.[1] ||
      text.match(/for\s+([a-z0-9_]+)\s+repcode/i)?.[1];
    let table =
      text.match(/table\s*name\s*[:=]?\s*([a-z0-9_]+)/i)?.[1] ||
      text.match(/tablename\s*[:=]?\s*([a-z0-9_]+)/i)?.[1] ||
      text.match(/table\s*[:=]?\s*([a-z0-9_]+)/i)?.[1] ||
      text.match(/from\s+([a-z0-9_]+)\s/i)?.[1];

    // try a fallback capture of any token after 'repcode'/'table'
    if (!repcode)
      repcode = text.match(/\brepcode\b.*?([a-z0-9_]+)/i)?.[1] || null;
    if (!table) table = text.match(/\btable\b.*?([a-z0-9_]+)/i)?.[1] || null;

    if (!repcode || !table) {
      return res.json({
        mode: "SQL_GEN",
        success: false,
        message:
          "Missing repcode or table name. Example: 'generate pageheader for repcode inwe table asab9'",
      });
    }

    if (section === "pageheader") {
      const sql = generatePageheaderSQL(repcode, table);
      return res.json({ mode: "SQL_GEN", success: true, sql });
    }
    if (section === "companyheader") {
      const sql = generateCompanyheaderSQL(repcode, table);
      return res.json({ mode: "SQL_GEN", success: true, sql });
    }

    // fallback SQL for unknown section - simple pattern:
    return res.json({
      mode: "SQL_GEN",
      success: false,
      message:
        "Section not recognized for SQL generation. Mention pageheader or companyheader or details.",
    });
  }

  // Default: fallback to search instruction (frontend has search)
  return res.json({
    mode: "SEARCH",
    message:
      "No direct intent detected: try 'what is pageheader view' or 'generate pageheader repcode inwe table asab9'.",
  });
});

export default router;
