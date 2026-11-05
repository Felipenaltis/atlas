import { test, expect } from "@playwright/test";

test("loads the anatomical model and supports selection, tools, collections and persistent learning", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("MODELO ANATÓMICO 3D", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fémur izquierdo", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/atlas-desktop.png",
    fullPage: true,
  });
  // Click the frontal surface on the actual canvas, independently of the catalogue.
  const canvas = await page
    .getByTestId("skeleton-viewer")
    .locator("canvas")
    .boundingBox();
  await page.waitForTimeout(700); // Finish the initial camera transition before picking.
  await page.mouse.click(
    canvas!.x + canvas!.width / 2,
    canvas!.y + canvas!.height * 0.075,
  );
  await expect(
    page.getByRole("heading", { name: "Fémur izquierdo", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Aislar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Aislar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Aislar", exact: true }).click();
  await page.getByRole("button", { name: "Posterior", exact: true }).click();
  await expect(page.getByLabel("Orientación posterior")).toBeVisible();
  await page.getByRole("button", { name: "Restablecer vista" }).click();
  await page
    .getByRole("textbox", { name: "Buscar estructura", exact: true })
    .fill("cúbito");
  const row = page.getByRole("button", { name: "Ulna (cúbito) izquierda" });
  await expect(row).toBeVisible();
  await row.click();
  await expect(
    page.getByRole("heading", { name: "Ulna (cúbito) izquierda" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar en mi colección" }).click();
  await page.getByRole("button", { name: "Marcar como aprendido" }).click();
  await page.reload();
  await expect(
    page.getByText("MODELO ANATÓMICO 3D", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mi colección 1" }).click();
  await page.getByRole("button", { name: "Ulna (cúbito) izquierda" }).click();
  await expect(
    page.getByRole("button", { name: "Añadido a aprendidos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accidentes óseos" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Olécranon" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("dictionary searches Spanish, Latin and extended source terms; quiz hides and reveals the answer", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Diccionario" }).click();
  await page
    .getByRole("textbox", { name: "Buscar término anatómico" })
    .fill("nervus medianus");
  await expect(
    page.getByRole("heading", { name: "Nervio mediano", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar término anatómico" })
    .fill("906*11");
  await expect(
    page.getByRole("heading", {
      name: "Diente incisivo superomedial",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await page.getByRole("button", { name: "Estudiar 206" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Qué hueso estás viendo?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Frontal", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Mostrar respuesta" }).click();
  await expect(
    page.getByRole("heading", { name: "Frontal", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lo sabía" }).click();
  await expect(page.getByText("TARJETA 2 DE 206")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "¿Qué hueso estás viendo?" }),
  ).toBeVisible();
});

test("mobile layout exposes all bones, shows detail and has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByText("MODELO ANATÓMICO 3D", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("skeleton-viewer")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/atlas-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Explorar huesos", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Buscar estructura", exact: true })
    .fill("tibia derecha");
  await page
    .getByRole("button", { name: "Tibia derecha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tibia derecha", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Cerrar ficha", { exact: true }).click();
  await page.getByRole("button", { name: "Diccionario" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("all five anatomical systems load selectable named structures", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [system, name] of [
    ["muscular", "Músculo sartorio"],
    ["cardiovascular", "Ventrículo izquierdo"],
    ["nervous", "Nervio mediano"],
    ["visceral", "Estómago"],
  ] as const) {
    await page
      .getByRole("combobox", { name: "Sistema anatómico" })
      .selectOption(system);
    await expect(
      page.getByText("MODELO ANATÓMICO 3D", { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByRole("heading", { name: new RegExp(name, "i") }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/atlas-${system}.png`,
      fullPage: true,
    });
    if (system === "muscular") {
      const layer = page.getByRole("button", { name: /Fascias y vainas/ });
      await layer.click();
      await expect(layer).toHaveAttribute("aria-pressed", "true");
      await layer.click();
    }
    await page.getByRole("button", { name: "Aislar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Aislar", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  expect(errors).toEqual([]);
});
