"use client";

/**
 * Audit log — read only, and there is no write path anywhere in the studio.
 *
 * Filter options are collected from the rows actually returned rather than a
 * hardcoded list, so a new kind of action starts appearing in the filters the
 * moment it happens. The seen-values set only ever grows, otherwise filtering to
 * one action would delete every other option from the dropdown.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ActionButton,
  AdminPage,
  DataTable,
  EmptyState,
  Field,
  LoadingBlock,
  Panel,
  Pill,
  Select,
  StatusBanner,
  Td,
  Th,
  Tr,
  useAdminResource,
} from "../_components/ui";

type AuditEntry = {
  id: string;
  actor_clerk_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: unknown;
  after_state: unknown;
  metadata: unknown;
  created_at: string;
};

type AuditPayload = { entries: AuditEntry[]; total: number };

const PAGE_SIZE = 50;

function whenText(iso: string): string {
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

function hasBody(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string[]>([]);
  const [options, setOptions] = useState<{ types: string[]; actions: string[] }>({
    types: [],
    actions: [],
  });

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    return `/api/admin/audit?${params.toString()}`;
  }, [entityType, action, offset]);

  const { data, loading, error, setError } = useAdminResource<AuditPayload>(url);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const total = data?.total ?? 0;

  useEffect(() => {
    if (entries.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions((prev) => ({
      types: Array.from(
        new Set([...prev.types, ...entries.map((e) => e.entity_type)]),
      ).sort(),
      actions: Array.from(
        new Set([...prev.actions, ...entries.map((e) => e.action)]),
      ).sort(),
    }));
  }, [entries]);

  const toggle = useCallback((id: string) => {
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + entries.length, total);
  const canPrev = offset > 0;
  const canNext = offset + entries.length < total;

  return (
    <AdminPage
      eyebrow="Records"
      title="Change log"
      description="Every change anyone made in Admin Studio, newest first. Nothing here can be edited or deleted — that is the point of it."
    >
      {error ? (
        <StatusBanner tone="error" onDismiss={() => setError("")}>
          {error}
        </StatusBanner>
      ) : null}

      <Panel
        title="Filter"
        description="Narrow the list down. The choices grow as more history loads."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What was changed" htmlFor="audit-entity">
            <Select
              id="audit-entity"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Everything</option>
              {options.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What happened" htmlFor="audit-action">
            <Select
              id="audit-action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Every action</option>
              {options.actions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {entityType || action ? (
          <div className="mt-4">
            <ActionButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setEntityType("");
                setAction("");
                setOffset(0);
              }}
            >
              Clear filters
            </ActionButton>
          </div>
        ) : null}
      </Panel>

      <div className="mt-6">
        {loading && !data ? (
          <LoadingBlock label="Loading the log" />
        ) : !data ? (
          // A 403 must not read as "nothing has ever happened".
          <EmptyState title="Change log not available">
            The message above says why. Staff accounts cannot read the change log.
          </EmptyState>
        ) : entries.length === 0 ? (
          <EmptyState title="Nothing recorded">
            {entityType || action
              ? "No changes match those filters."
              : "Once you or your team change something, it is recorded here."}
          </EmptyState>
        ) : (
          <Panel>
            <DataTable
              head={
                <Tr>
                  <Th className="w-10">
                    <span className="sr-only">Details</span>
                  </Th>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>What happened</Th>
                  <Th>What was changed</Th>
                </Tr>
              }
            >
              {entries.map((entry) => {
                const expanded = open.includes(entry.id);
                const detailed =
                  hasBody(entry.before_state) ||
                  hasBody(entry.after_state) ||
                  hasBody(entry.metadata);
                return (
                  <Fragment key={entry.id}>
                  <Tr>
                    <Td>
                      {detailed ? (
                        <button
                          type="button"
                          onClick={() => toggle(entry.id)}
                          aria-expanded={expanded}
                          aria-controls={`audit-detail-${entry.id}`}
                          aria-label={
                            expanded
                              ? `Hide details of ${entry.action}`
                              : `Show details of ${entry.action}`
                          }
                          className="border border-line/20 p-1 text-content/50 transition-colors hover:border-content/40 hover:text-content"
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap text-[11px] text-content/55">
                      {whenText(entry.created_at)}
                    </Td>
                    <Td className="font-mono text-[11px] text-content/50">
                      {entry.actor_clerk_user_id ?? "System"}
                    </Td>
                    <Td>
                      <span className="font-medium text-content">{entry.action}</span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone="neutral">{entry.entity_type}</Pill>
                        {entry.entity_id ? (
                          <span className="font-mono text-[11px] text-content/45">
                            {entry.entity_id}
                          </span>
                        ) : null}
                      </div>
                    </Td>
                  </Tr>
                  {expanded ? (
                    <Tr>
                      <td
                        colSpan={5}
                        id={`audit-detail-${entry.id}`}
                        className="bg-surface-hover/30 px-4 py-4"
                      >
                        <div className="grid gap-4 lg:grid-cols-3">
                          <JsonBlock title="Before" value={entry.before_state} />
                          <JsonBlock title="After" value={entry.after_state} />
                          <JsonBlock title="Extra detail" value={entry.metadata} />
                        </div>
                      </td>
                    </Tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </DataTable>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/10 pt-4">
              <p className="text-xs tabular-nums text-content/50">
                Showing {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                <ActionButton
                  size="sm"
                  variant="outline"
                  disabled={!canPrev || loading}
                  onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}
                >
                  Newer
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="outline"
                  disabled={!canNext || loading}
                  onClick={() => setOffset((v) => v + PAGE_SIZE)}
                >
                  Older
                </ActionButton>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </AdminPage>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-content/40">
        {title}
      </p>
      {hasBody(value) ? (
        <pre className="max-h-64 overflow-x-auto overflow-y-auto border border-line/12 bg-surface p-3 text-[11px] leading-relaxed text-content/70">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="text-[11px] text-content/35">Nothing recorded</p>
      )}
    </div>
  );
}
