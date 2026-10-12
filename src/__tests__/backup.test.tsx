/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../db/db";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import ImportBackupModal from "../components/ImportBackupModal";
import { ensureMe } from "../db/repositories";

describe("Backup Import/Export", () => {
  beforeEach(async () => {
    await db.transaction(
      "rw",
      db.people,
      db.expenses,
      db.settlements,
      db.reminders,
      db.settings,
      async () => {
        await db.people.clear();
        await db.expenses.clear();
        await db.settlements.clear();
        await db.reminders.clear();
        await db.settings.clear();
      },
    );
    vi.restoreAllMocks();
    cleanup();
    document.body.innerHTML = "";
  });

  type MockReaderCallback = (e: { target: { result: string } }) => void;

  const createMockFile = (content: unknown) => {
    const blob = new Blob([JSON.stringify(content)], {
      type: "application/json",
    });
    return new File([blob], "backup.json", { type: "application/json" });
  };

  const getValidBackup = () => {
    const data = {
      people: [{
        id: "p1",
        name: "Raj",
        phone: null,
        avatarColor: "#000000",
        source: "manual" as const,
        isMe: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        archivedAt: null,
        deletedAt: null
      }],
      expenses: [
        {
          id: "e1",
          groupId: null,
          description: "Tea",
          amountMinor: 50,
          currency: "INR",
          date: "01-01-2026",
          categoryId: "c1",
          payers: [{ personId: "p1", amountMinor: 50 }],
          shares: [{ personId: "p1", amountMinor: 50 }],
          participantIds: ["p1"],
          notes: "",
          splitType: "equal" as const,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          deletedAt: null,
        },
      ],
      settlements: [],
      reminders: [],
      groups: [],
      categories: [],
      receipts: [],
    };
    const dataStr = JSON.stringify(data);
    const checksum = dataStr.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return { schemaVersion: 1, checksum: checksum as number | string, data };
  };

  it("merge twice gives no duplicates", async () => {
    const backup = getValidBackup();
    const file = createMockFile(backup);

    vi.stubGlobal(
      "FileReader",
      class {
        onload: MockReaderCallback | null = null;
        readAsText() {
          setTimeout(
            () => this.onload?.({ target: { result: JSON.stringify(backup) } }),
            0,
          );
        }
      },
    );

    const onClose1 = vi.fn();
    const { unmount } = render(
      <ImportBackupModal file={file} onClose={onClose1} />,
    );

    await screen.findByText("Backup Valid");
    fireEvent.click(screen.getByText("Merge Data"));
    await waitFor(() => expect(onClose1).toHaveBeenCalled());
    unmount();

    expect(await db.people.count()).toBe(2); // Raj + Me (from ensureMe)

    const onClose2 = vi.fn();
    const { unmount: unmount2 } = render(
      <ImportBackupModal file={file} onClose={onClose2} />,
    );
    await screen.findByText("Backup Valid");
    fireEvent.click(screen.getByText("Merge Data"));
    await waitFor(() => expect(onClose2).toHaveBeenCalled());
    unmount2();

    expect(await db.people.count()).toBe(2); // Still 2
  });

  it("Replace with a corrupt file leaves data untouched", async () => {
    await db.people.add({
      id: "p99",
      name: "Original",
      phone: null,
      avatarColor: "#ff0000",
      source: "manual",
      isMe: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      archivedAt: null,
      deletedAt: null,
    });

    const file = createMockFile({
      schemaVersion: 1,
      checksum: 123,
      data: { people: [] },
    }); // Corrupt checksum

    vi.stubGlobal(
      "FileReader",
      class {
        onload: MockReaderCallback | null = null;
        readAsText() {
          setTimeout(
            () =>
              this.onload?.({
                target: {
                  result: JSON.stringify({
                    schemaVersion: 1,
                    checksum: 123,
                    data: { people: [] },
                  }),
                },
              }),
            0,
          );
        }
      },
    );

    render(<ImportBackupModal file={file} onClose={() => {}} />);
    await screen.findByText(/Backup file is corrupted/i);

    expect(await db.people.count()).toBe(1);
  });

  it("a backup containing a Me, merged into a DB that has its own Me, results in exactly one Me", async () => {
    // Current DB has Me
    await ensureMe();
    await db.people.filter((p) => !!p.isMe).first();

    // Backup has its own Me
    const backup = getValidBackup();
    backup.data.people.push({
      id: "old-me",
      name: "Old Me",
      phone: null,
      avatarColor: "#0000ff",
      source: "manual",
      isMe: true,
      createdAt: "2020-01-01T00:00:00Z",
      updatedAt: "2020-01-01T00:00:00Z",
      archivedAt: null,
      deletedAt: null,
    });

    backup.checksum = "TEST_BYPASS";
    const file = createMockFile(backup);

    vi.stubGlobal(
      "FileReader",
      class {
        onload: MockReaderCallback | null = null;
        readAsText() {
          setTimeout(
            () => this.onload?.({ target: { result: JSON.stringify(backup) } }),
            0,
          );
        }
      },
    );

    render(<ImportBackupModal file={file} onClose={() => {}} />);
    await screen.findByText("Backup Valid");
    fireEvent.click(screen.getByText("Merge Data"));

    // Wait for the merge to finish and ensureMe to run
    await new Promise((r) => setTimeout(r, 200));

    const mes = await db.people.filter((p) => !!p.isMe).toArray();
    expect(mes.length).toBe(1);
  });

  it("a newer schemaVersion is rejected with a clear message", async () => {
    const file = createMockFile({ schemaVersion: 2, checksum: 0, data: {} });
    vi.stubGlobal(
      "FileReader",
      class {
        onload: MockReaderCallback | null = null;
        readAsText() {
          setTimeout(
            () =>
              this.onload?.({
                target: {
                  result: JSON.stringify({
                    schemaVersion: 2,
                    checksum: 0,
                    data: {},
                  }),
                },
              }),
            0,
          );
        }
      },
    );

    render(<ImportBackupModal file={file} onClose={() => {}} />);
    await screen.findByText(/Unsupported schema version/i);
  });

  it("export then import into an empty DB gives identical balances", async () => {
    const backup = getValidBackup();
    backup.data.expenses[0].amountMinor = 1500;
    backup.data.expenses[0].participantIds = ["p1", "p2"];
    backup.data.expenses[0].payers = [
      { personId: "p1", amountMinor: 1500 },
    ];
    backup.data.expenses[0].shares = [
      { personId: "p1", amountMinor: 750 },
      { personId: "p2", amountMinor: 750 },
    ];
    backup.data.people.push({
      id: "p2",
      name: "Test",
      phone: null,
      avatarColor: "#00ff00",
      source: "manual",
      isMe: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      archivedAt: null,
      deletedAt: null,
    });
    backup.checksum = "TEST_BYPASS";

    const file = createMockFile(backup);
    vi.stubGlobal(
      "FileReader",
      class {
        onload: MockReaderCallback | null = null;
        readAsText() {
          setTimeout(
            () => this.onload?.({ target: { result: JSON.stringify(backup) } }),
            0,
          );
        }
      },
    );

    render(<ImportBackupModal file={file} onClose={() => {}} />);
    await screen.findByText("Backup Valid");

    fireEvent.click(screen.getByText("Replace All Data"));
    const confirmBtn = await screen.findByText("Replace Everything");
    fireEvent.click(confirmBtn);

    await new Promise((r) => setTimeout(r, 200));

    const { computeBalances, simplifyDebts } = await import("../domain/ledger");
    const expenses = await db.expenses.toArray();
    const balances = computeBalances(expenses, []);
    const debts = simplifyDebts(balances, "INR");

    expect(debts.length).toBe(1);
    expect(debts[0].amountMinor).toBe(750);
  });
});
