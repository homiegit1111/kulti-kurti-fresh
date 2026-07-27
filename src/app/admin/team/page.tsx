"use client";

/**
 * Team.
 *
 * The env-owner list is shown but never editable: it is the lock-out escape
 * hatch, so the UI must not imply it can be emptied from here. The API refuses a
 * change that would remove the caller's own access, and that sentence is shown
 * verbatim.
 */

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  ActionButton,
  AdminPage,
  ConfirmButton,
  DataTable,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  SectionGrid,
  Select,
  StatusBanner,
  Td,
  TextArea,
  TextInput,
  Th,
  Tr,
  adminFetch,
  useAdminResource,
} from "../_components/ui";
import type { PillTone } from "../_components/ui";

type Role = "owner" | "manager" | "staff";

type Member = {
  clerkUserId: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  note: string;
  createdAt: string;
  lastSeenAt: string | null;
};

type TeamPayload = {
  members: Member[];
  envOwners: string[];
  you: { userId: string; role: Role; source: string };
};

const ROLES: Role[] = ["staff", "manager", "owner"];

const ROLE_LABEL: Record<Role, string> = {
  staff: "Staff",
  manager: "Manager",
  owner: "Owner",
};

const ROLE_TONE: Record<Role, PillTone> = {
  staff: "neutral",
  manager: "accent",
  owner: "good",
};

const ROLE_CAN: Record<Role, string> = {
  staff: "Stock counts and draft wording. Cannot publish, delete, or see money.",
  manager:
    "The shop day to day — styles, collections, stock, content, offers, orders. Cannot change pricing or this team list.",
  owner: "Everything, including wholesale pricing and who is on this team.",
};

const USER_ID = /^user_[A-Za-z0-9]{10,40}$/;

function whenText(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminTeamPage() {
  const { data, loading, error, setError, reload } =
    useAdminResource<TeamPayload>("/api/admin/team");

  const [showAdd, setShowAdd] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<Role>("staff");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [notice, setNotice] = useState("");

  const members = useMemo(() => data?.members ?? [], [data]);
  const envOwners = useMemo(() => data?.envOwners ?? [], [data]);
  const you = data?.you;

  const run = useCallback(
    async (clerkUserId: string, work: () => Promise<string>) => {
      setPendingId(clerkUserId);
      setError("");
      setNotice("");
      try {
        setNotice(await work());
        await reload();
      } catch (e) {
        // Includes the self-lockout 409 — written for the owner, shown as-is.
        setError(e instanceof Error ? e.message : "That change did not go through.");
      } finally {
        setPendingId("");
      }
    },
    [reload, setError],
  );

  async function addMember() {
    const clerkUserId = newUserId.trim();
    if (!USER_ID.test(clerkUserId)) {
      setAddError(
        "That does not look like a Clerk user id. It starts with user_ followed by letters and numbers.",
      );
      return;
    }
    setAdding(true);
    setAddError("");
    setNotice("");
    try {
      await adminFetch<{ member: Member }>("/api/admin/team", {
        method: "POST",
        body: {
          clerkUserId,
          role: newRole,
          displayName: newName.trim(),
          email: newEmail.trim(),
          note: newNote.trim(),
        },
      });
      setNewUserId("");
      setNewName("");
      setNewEmail("");
      setNewNote("");
      setNewRole("staff");
      setShowAdd(false);
      await reload();
      setNotice(
        `Added as ${ROLE_LABEL[newRole].toLowerCase()}. Their access works on their next page load.`,
      );
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add that person.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <AdminPage
      eyebrow="People"
      title="Team"
      description="Who can sign in to Admin Studio, and how much of it they can use."
      actions={
        <ActionButton onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5" /> Add someone
        </ActionButton>
      }
    >
      {error ? (
        <StatusBanner tone="error" onDismiss={() => setError("")}>
          {error}
        </StatusBanner>
      ) : null}
      {notice ? (
        <StatusBanner tone="success" onDismiss={() => setNotice("")}>
          {notice}
        </StatusBanner>
      ) : null}

      {loading && !data ? (
        <LoadingBlock label="Loading the team" />
      ) : !data ? (
        // Without this, a 403 would fall through to "no one added yet" — which
        // reads as an empty team rather than a list this account cannot see.
        <EmptyState title="Team list not available">
          The message above says why. Only an owner account can see or change who is
          on the team.
        </EmptyState>
      ) : (
        <SectionGrid>
          {showAdd ? (
            <Panel
              title="Add someone"
              description="They sign in with their own Clerk account. Add their Clerk user id here and pick what they may do."
            >
              {addError ? (
                <StatusBanner tone="error" onDismiss={() => setAddError("")}>
                  {addError}
                </StatusBanner>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Clerk user id"
                  help="From your Clerk dashboard, under Users. It starts with user_."
                  htmlFor="team-user-id"
                >
                  <TextInput
                    id="team-user-id"
                    value={newUserId}
                    spellCheck={false}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="user_2abCDef..."
                  />
                </Field>
                <Field label="What they may do" htmlFor="team-role">
                  <Select
                    id="team-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Name" help="For your own reference." htmlFor="team-name">
                  <TextInput
                    id="team-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Asha"
                  />
                </Field>
                <Field label="Email" help="For your own reference." htmlFor="team-email">
                  <TextInput
                    id="team-email"
                    value={newEmail}
                    spellCheck={false}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="asha@example.com"
                  />
                </Field>
              </div>
              <div className="mt-5">
                <Field label="Note" help="Optional. Only you see this." htmlFor="team-note">
                  <TextArea
                    id="team-note"
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                </Field>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-content/55">
                {ROLE_LABEL[newRole]}: {ROLE_CAN[newRole]}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton onClick={() => void addMember()} busy={adding}>
                  Add to the team
                </ActionButton>
                <ActionButton variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </ActionButton>
              </div>
            </Panel>
          ) : null}

          <Panel title="Members">
            {members.length === 0 ? (
              <EmptyState
                title="No one added yet"
                action={
                  <ActionButton onClick={() => setShowAdd(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add someone
                  </ActionButton>
                }
              >
                You are signed in through the always-on owner list below, so the shop is
                never locked. Add staff or a manager to share the work.
              </EmptyState>
            ) : (
              <DataTable
                head={
                  <Tr>
                    <Th>Person</Th>
                    <Th>Clerk user id</Th>
                    <Th className="w-40">What they may do</Th>
                    <Th>Access</Th>
                    <Th>Last seen</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                }
              >
                {members.map((member) => {
                  const isYou = you?.userId === member.clerkUserId;
                  const busy = pendingId === member.clerkUserId;
                  return (
                    <Tr key={member.clerkUserId}>
                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-content">
                            {member.displayName || member.email || "Unnamed"}
                          </p>
                          {isYou ? <Pill tone="accent">You</Pill> : null}
                        </div>
                        {member.email && member.displayName ? (
                          <p className="mt-0.5 text-[11px] text-content/45">
                            {member.email}
                          </p>
                        ) : null}
                        {member.note ? (
                          <p className="mt-0.5 text-[11px] italic text-content/40">
                            {member.note}
                          </p>
                        ) : null}
                      </Td>
                      <Td className="font-mono text-[11px] text-content/50">
                        {member.clerkUserId}
                      </Td>
                      <Td>
                        <Select
                          aria-label={`Role for ${member.displayName || member.clerkUserId}`}
                          value={member.role}
                          disabled={busy}
                          onChange={(e) => {
                            const role = e.target.value as Role;
                            void run(member.clerkUserId, async () => {
                              await adminFetch<{ member: Member }>("/api/admin/team", {
                                method: "PATCH",
                                body: { clerkUserId: member.clerkUserId, role },
                              });
                              return `${member.displayName || member.clerkUserId} is now ${ROLE_LABEL[role].toLowerCase()}.`;
                            });
                          }}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        <Pill tone={member.isActive ? ROLE_TONE[member.role] : "neutral"}>
                          {member.isActive ? "Can sign in" : "Switched off"}
                        </Pill>
                      </Td>
                      <Td className="whitespace-nowrap text-[11px] text-content/55">
                        {whenText(member.lastSeenAt)}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {member.isActive ? (
                            <ConfirmButton
                              label="Switch off"
                              confirmLabel="Tap again to switch off"
                              busy={busy}
                              onConfirm={() =>
                                void run(member.clerkUserId, async () => {
                                  await adminFetch<{ member: Member }>("/api/admin/team", {
                                    method: "PATCH",
                                    body: {
                                      clerkUserId: member.clerkUserId,
                                      isActive: false,
                                    },
                                  });
                                  return `${member.displayName || member.clerkUserId} can no longer sign in. Their record is kept.`;
                                })
                              }
                            />
                          ) : (
                            <ActionButton
                              size="sm"
                              variant="outline"
                              busy={busy}
                              onClick={() =>
                                void run(member.clerkUserId, async () => {
                                  await adminFetch<{ member: Member }>("/api/admin/team", {
                                    method: "PATCH",
                                    body: {
                                      clerkUserId: member.clerkUserId,
                                      isActive: true,
                                    },
                                  });
                                  return `${member.displayName || member.clerkUserId} can sign in again.`;
                                })
                              }
                            >
                              Switch on
                            </ActionButton>
                          )}
                          <ConfirmButton
                            label="Remove"
                            confirmLabel="Tap again to remove"
                            busy={busy}
                            onConfirm={() =>
                              void run(member.clerkUserId, async () => {
                                await adminFetch<{ ok: true; removed: true }>(
                                  `/api/admin/team?clerkUserId=${encodeURIComponent(member.clerkUserId)}`,
                                  { method: "DELETE" },
                                );
                                return `${member.displayName || member.clerkUserId} was removed from the team.`;
                              })
                            }
                          />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </DataTable>
            )}
          </Panel>

          <Panel
            title="Always-on owners (set in environment)"
            description="These accounts are owners because they are listed in the site's ADMIN_CLERK_USER_IDS setting. They cannot be edited or removed here — that is deliberate, so a mistake on this page can never lock you out of your own shop. Changing the list means changing the site's environment settings."
          >
            {envOwners.length === 0 ? (
              <p className="text-sm text-content/55">
                No always-on owners are configured. Ask your developer to set
                ADMIN_CLERK_USER_IDS — without it, a wrong change here could lock
                everyone out.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {envOwners.map((id) => (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-2 border border-line/12 px-3 py-2"
                  >
                    <span className="font-mono text-[11px] text-content/60">{id}</span>
                    <Pill tone="good">Owner</Pill>
                    {you?.userId === id ? <Pill tone="accent">You</Pill> : null}
                    <Pill tone="neutral">Read only</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="What each role can do"
            description="Give the smallest role that lets someone finish their work."
          >
            <dl className="flex flex-col gap-4">
              {ROLES.map((role) => (
                <div key={role} className="flex flex-col gap-1">
                  <dt>
                    <Pill tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Pill>
                  </dt>
                  <dd className="text-sm leading-relaxed text-content/60">
                    {ROLE_CAN[role]}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </SectionGrid>
      )}
    </AdminPage>
  );
}
