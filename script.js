const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

let data = {};

(async () => {
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
    });

    response.results.forEach(async (result) => {
        const mdblocks = await n2m.pageToMarkdown(result.id);
        const mdString = n2m.toMarkdownString(mdblocks);

        if (
            !data.hasOwnProperty(result.properties["Calendar week"]["number"])
        ) {
            data[result.properties["Calendar week"]["number"]] = [];
        }

        data[result.properties["Calendar week"]["number"]].push({
            image: result.properties["Cover"]["files"][0]["name"],
            title: result.properties["Name"]["title"][0]["plain_text"],
            author: result.properties["Author"]["rich_text"][0]["plain_text"],
            wordsCount: result.properties["Words count"]["number"],
            takeAways: mdString.parent,
        });
    });
})();

Object.keys(data).forEach(async (weekNr) => {
    let page = `# ${weekNr}. Calendar week
    `;

    data[weekNr].forEach((book, index) => {
        page += `
        ![${book.title}](${book.image})

        ## ${book.title}

        <p class="text-gray-light">
            <em>${book.author} • ${book.wordsCount} words</em>
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

    page = page.replace(/^ +/gm, "");

    await Bun.write(`./chapters/${weekNr}_cw.md`, page);
});
