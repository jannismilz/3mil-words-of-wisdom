const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

let data = {};

async function parseNotionData() {
    const databaseId = "60e41de9789c4dfc84f08ca2feec20d5";
    const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
            and: [
                {
                    property: "Calendar week",
                    number: {
                        is_not_empty: true,
                    },
                },
                {
                    property: "Irrelevant",
                    checkbox: {
                        equals: false,
                    },
                },
            ],
        },
        sorts: [
            {
                property: "Calendar week",
                direction: "ascending",
            },
        ],
    });

    let totalProccessed = 0;

    response.results.forEach(async (result, index) => {
        const mdblocks = await n2m.pageToMarkdown(result.id);
        const mdString = n2m.toMarkdownString(mdblocks);

        const calendarWeek = JSON.stringify(
            result.properties["Calendar week"]["number"]
        );

        if (!data.hasOwnProperty(calendarWeek)) {
            data[calendarWeek] = [];
        }

        data[calendarWeek].push({
            image: result.properties["Cover"]["files"][0]["file"]["url"],
            title: result.properties["Name"]["title"][0]["plain_text"],
            author: result.properties["Author"]["rich_text"][0]["plain_text"],
            wordsCount: result.properties["Words count"]["number"],
            takeAways: mdString.parent || "",
        });

        totalProccessed++;

        if (totalProccessed === response.results.length) {
            await generateChapters();
        }
    });
}

async function generateChapters() {
    Object.keys(data).forEach(async (weekNr) => {
        let page = `# ${weekNr}. Calendar week
    `;

        data[weekNr].forEach((book, index) => {
            page += `
![${book.title}](${book.image})

## ${book.title}

<p class="text-gray-light">
    <em>${book.author} • ${book.wordsCount.toLocaleString("en-US")} words</em>
</p>

<h3>Key takeaways</h3>

${book.takeAways}
      `;

            if (data[weekNr][index + 1]) {
                page += `
<div class="pagebreak"></div>
            `;
            }
        });

        await Bun.write(`./chapters/${weekNr}_cw.md`, page);
    });
}

await parseNotionData();
