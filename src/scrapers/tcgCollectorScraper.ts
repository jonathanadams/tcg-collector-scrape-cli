import { Page } from "puppeteer";

export interface TCGCollectorScrapedData {
  name: string;
  code: string;
  cards: {
    name: string;
    number: string;
    rarity: string;
    energyType: string;
    variants: string[];
  }[];
  scrapedAt: string;
}

export async function tcgCollectorScraper(
  page: Page
): Promise<TCGCollectorScrapedData> {
  await page.waitForSelector("#card-search-result", { visible: true });

  const setName = await page.$eval(
    "#card-search-result-title-set-like-name",
    (el) => el.textContent?.trim() || ""
  );

  const setCode = await page.$eval(
    "#card-search-result-title-set-code",
    (el) => el.textContent?.trim() || ""
  );

  const scrapedCards: TCGCollectorScrapedData["cards"] = [];

  const cardsList = await page.$$(".card-list-item");
  for (let i = 0; i < cardsList.length; i++) {
    const card = cardsList[i];

    // ---- Collect basic info ----
    const data = await card.evaluate((c) => {
      const getText = (sel: any) =>
        c.querySelector(sel)?.textContent?.trim() || "";
      const name = getText(".card-list-item-card-name a") as string;
      const number = getText(
        ".card-list-item-card-number .card-list-item-entry-text"
      ) as string;
      const rarity =
        c
          .querySelector(".card-list-item-rarity img")
          ?.getAttribute("alt")
          ?.trim() || ("" as string);
      const energyType =
        c
          .querySelector(".card-list-item-card-type img")
          ?.getAttribute("alt")
          ?.trim() || ("Trainer" as string);
      return { name, number, rarity, energyType };
    });

    // ---- Click the + button ----
    const plusButton = await card.$(".number-spinner-increment-button");
    if (!plusButton) {
      console.warn(`⚠️  No + button found for ${data.name}`);
      continue;
    }
    await plusButton.evaluate((b) => b.scrollIntoView({ block: "center" }));
    await plusButton.hover();
    await plusButton.click();

    // ---- Wait for dropdown to appear (dynamically added child element) ----
    await page.waitForSelector(
      ".card-collection-card-controls-dropdown.dropdown.shown .dropdown-menu",
      {
        visible: true,
        timeout: 6000,
      }
    );
    const dropdownHandle = await page.$(
      ".card-collection-card-controls-dropdown.dropdown.shown .dropdown-menu"
    );

    // ---- Extract variants ----
    const variants = dropdownHandle
      ? await dropdownHandle.$$eval(
          ".card-collection-card-controls-add-card-variant-button",
          (buttons) =>
            buttons.map((btn) =>
              Array.from(btn.childNodes)
                .filter(
                  (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
                )
                .map((n) => n.textContent!.trim())
                .join(" ")
            )
        )
      : [];

    // ---- Close dropdown by clicking outside ----
    await page.mouse.click(0, 0);

    // Wait until dropdown disappears
    await page.waitForSelector(
      `.card-list-item[data-card-id="${await card.evaluate((c) =>
        c.getAttribute("data-card-id")
      )}"] .card-collection-card-controls-dropdown.dropdown.shown`,
      { hidden: true, timeout: 4000 }
    );

    scrapedCards.push({ ...data, variants });
  }

  return {
    name: setName,
    code: setCode,
    cards: scrapedCards,
    scrapedAt: new Date().toISOString(),
  };
}
