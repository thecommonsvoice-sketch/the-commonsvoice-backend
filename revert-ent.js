
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Reverting 'Entertainment' to 'Page 4'...");

    // Find Entertainment
    const entertainment = await prisma.category.findFirst({
        where: {
            OR: [
                { slug: "entertainment" },
                { name: "Entertainment" }
            ]
        }
    });

    if (!entertainment) {
        console.log("Category 'Entertainment' not found.");

        // Check if Page 4 exists
        const page4 = await prisma.category.findUnique({ where: { slug: "page-4" } });
        if (page4) {
            console.log("Found 'Page 4'. Ensuring name is correct.");
            await prisma.category.update({
                where: { id: page4.id },
                data: { name: "Page 4", slug: "page-4" }
            });
        }
        return;
    }

    // Update Entertainment -> Page 4
    const updated = await prisma.category.update({
        where: { id: entertainment.id },
        data: {
            name: "Page 4",
            slug: "page-4"
        }
    });

    console.log(`Successfully reverted category to: ${updated.name} (${updated.slug})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
