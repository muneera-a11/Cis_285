"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: string; name: string };
type Expense = { id: string; description: string; amountCents: number; payerId: string; payer: Member; createdAt: string; participants: { member: Member }[] };
type Group = { id: string; name: string; members: Member[]; expenses: Expense[] };
type Summary = { groups: Group[] };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(cents) / 100);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body as T;
}

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const active = groups.find((group) => group.id === activeId) ?? groups[0];
  const balances = useMemo(() => {
    const result = new Map<string, number>((active?.members ?? []).map((member) => [member.id, 0]));
    for (const expense of active?.expenses ?? []) {
      const ids = expense.participants.map(({ member }) => member.id).sort();
      if (!ids.length) continue;
      const base = Math.floor(expense.amountCents / ids.length);
      const remainder = expense.amountCents % ids.length;
      ids.forEach((id, index) => result.set(id, (result.get(id) ?? 0) - base - (index < remainder ? 1 : 0)));
      result.set(expense.payerId, (result.get(expense.payerId) ?? 0) + expense.amountCents);
    }
    return result;
  }, [active]);
  const net = [...balances.values()].reduce((sum, value) => sum + value, 0);

  async function refresh(selectId?: string) {
    const data = await request<Summary>("/api/groups");
    setGroups(data.groups);
    const nextId = selectId && data.groups.some((group) => group.id === selectId) ? selectId : activeId && data.groups.some((group) => group.id === activeId) ? activeId : data.groups[0]?.id ?? "";
    setActiveId(nextId);
    const next = data.groups.find((group) => group.id === nextId);
    if (next) {
      setPayerId((current) => next.members.some((member) => member.id === current) ? current : next.members[0]?.id ?? "");
      setParticipantIds((current) => current.filter((id) => next.members.some((member) => member.id === id)));
    }
  }

  useEffect(() => {
    request<Summary>("/api/groups").then((data) => { setGroups(data.groups); setActiveId(data.groups[0]?.id ?? ""); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function submit(action: () => Promise<void>, success: string) {
    setError(""); setNotice(""); setSaving(true);
    try { await action(); setNotice(success); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setSaving(false); }
  }

  function addGroup(event: React.FormEvent) {
    event.preventDefault();
    void submit(async () => { const data = await request<{ group: Group }>("/api/groups", { method: "POST", body: JSON.stringify({ name: groupName }) }); setGroupName(""); await refresh(data.group.id); }, "Group created.");
  }
  function addMember(event: React.FormEvent) {
    event.preventDefault(); if (!active) return;
    void submit(async () => { await request(`/api/groups/${active.id}/members`, { method: "POST", body: JSON.stringify({ name: memberName }) }); setMemberName(""); await refresh(active.id); }, "Member added.");
  }
  function addExpense(event: React.FormEvent) {
    event.preventDefault(); if (!active) return;
    void submit(async () => { await request(`/api/groups/${active.id}/expenses`, { method: "POST", body: JSON.stringify({ description, amount, payerId, participantIds }) }); setDescription(""); setAmount(""); await refresh(active.id); }, "Expense recorded.");
  }

  const toggleParticipant = (id: string) => setParticipantIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">S</span><span>Split<span className="brand-light">Smart</span></span></a>
        <div className="topbar-right"><span className="secure-dot" /> Your groups, in one place <span className="avatar">✦</span></div>
      </header>
      <section className="hero">
        <div><p className="eyebrow">SHARED, SIMPLIFIED</p><h1>Good times, <em>even</em> splits.</h1><p className="hero-copy">Keep the group in sync. We’ll take care of the math.</p></div>
        <div className="hero-art" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="coin coin-one">$</span><span className="coin coin-two">↗</span><span className="coin coin-three">✓</span><span className="art-center">✳</span></div>
      </section>
      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading"><span className="eyebrow">YOUR SPACES</span><span className="count-pill">{groups.length}</span></div>
          <div className="group-list">
            {groups.map((group, index) => <button key={group.id} className={`group-item ${active?.id === group.id ? "selected" : ""}`} onClick={() => setActiveId(group.id)}><span className={`group-icon tone-${index % 4}`}>{group.name.trim().charAt(0).toUpperCase()}</span><span className="group-text"><strong>{group.name}</strong><small>{group.members.length} {group.members.length === 1 ? "member" : "members"}</small></span><span className="chevron">›</span></button>)}
            {groups.length === 0 && !loading && <p className="empty-small">Your next adventure starts here.</p>}
          </div>
          <form className="create-group" onSubmit={addGroup}><label htmlFor="group-name">Create a group</label><div className="inline-form"><input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Cabin weekend" maxLength={60} required/><button className="add-button" type="submit" aria-label="Create group" disabled={saving}>+</button></div></form>
          <div className="sidebar-tip"><span>✦</span><p><strong>Good to know</strong><br/>Everyone’s share is rounded down to the cent, fairly.</p></div>
        </aside>
        <section className="main-content">
          {error && <div className="alert error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
          {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
          {loading ? <div className="loading">Getting things ready…</div> : !active ? <div className="welcome-card"><span className="welcome-icon">✳</span><h2>Make room for shared plans.</h2><p>Create your first group to start tracking expenses and see who owes what.</p><form onSubmit={addGroup} className="welcome-form"><input aria-label="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Name your group" maxLength={60} required/><button className="primary-button" disabled={saving}>Create your first group <span>→</span></button></form></div> : <>
            <div className="page-heading"><div><div className="breadcrumb">YOUR GROUPS <span>/</span> {active.name.toUpperCase()}</div><h2>{active.name}<span className="heading-spark">✳</span></h2><p>{active.members.length ? `${active.members.length} people keeping things even` : "Add your people to get started"}</p></div><div className="heading-badge"><span className="badge-dot"/> ACTIVE GROUP</div></div>
            <div className="summary-grid"><div className="summary-card balance-card"><div className="card-label">GROUP BALANCE <span>ⓘ</span></div><div className="big-balance">{money(net)} <span>balanced</span></div><div className="balance-progress"><span/></div><div className="balance-note"><span>✓</span> Every cent is accounted for</div></div><div className="summary-card members-card"><div className="card-label">YOUR PEOPLE <span className="card-count">{active.members.length}</span></div><div className="avatar-stack">{active.members.slice(0, 4).map((m, i) => <span key={m.id} className={`person-avatar person-${i % 4}`} title={m.name}>{m.name.slice(0,1).toUpperCase()}</span>)}{active.members.length > 4 && <span className="more-avatar">+{active.members.length - 4}</span>}{active.members.length === 0 && <span className="no-people">Add the first member below</span>}</div><div className="member-summary">{active.members.length ? `${active.members.map(m => m.name).join(", ")}` : "A group is better together"}</div></div></div>
            <div className="section-title"><div><h3>Group balances</h3><p>Here’s where everyone stands right now.</p></div><span className="live-label"><i/> LIVE</span></div>
            <div className="balance-list">{active.members.map((member, index) => { const value = balances.get(member.id) ?? 0; return <div className="balance-row" key={member.id}><span className={`person-avatar small person-${index % 4}`}>{member.name.slice(0,1).toUpperCase()}</span><span className="member-info"><strong>{member.name}</strong><small>{value > 0 ? "is owed" : value < 0 ? "owes" : "all settled up"}</small></span><span className={`balance-value ${value > 0 ? "positive" : value < 0 ? "negative" : "zero"}`}>{value > 0 ? "+" : value < 0 ? "−" : ""}{money(value)}</span></div>})}{active.members.length === 0 && <div className="empty-row">Add a member to see group balances.</div>}</div>
            <div className="lower-grid">
              <section className="panel add-member-panel"><div className="panel-heading"><span className="panel-icon people-icon">♧</span><div><h3>Add your people</h3><p>Bring everyone into the group.</p></div></div><form onSubmit={addMember} className="stack-form"><label htmlFor="member-name">Name</label><div className="inline-form"><input id="member-name" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. Alex Morgan" maxLength={60} required/><button className="primary-button compact" disabled={saving || !active}>Add member</button></div></form></section>
              <section className="panel expense-panel"><div className="panel-heading"><span className="panel-icon expense-icon">↗</span><div><h3>Log an expense</h3><p>Split the cost, skip the back and forth.</p></div></div><form onSubmit={addExpense} className="expense-form"><div className="form-row"><div className="field grow"><label htmlFor="description">What was it for?</label><input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" maxLength={100} required/></div><div className="field amount-field"><label htmlFor="amount">Amount</label><div className="amount-input"><span>$</span><input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" required/></div></div></div><div className="form-row"><div className="field grow"><label htmlFor="payer">Paid by</label><select id="payer" value={payerId} onChange={(e) => setPayerId(e.target.value)} required disabled={!active.members.length}><option value="">Select a member</option>{active.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div></div><fieldset className="participants"><legend>Split between</legend><div className="participant-list">{active.members.map(m => <label key={m.id} className={`participant ${participantIds.includes(m.id) ? "checked" : ""}`}><input type="checkbox" checked={participantIds.includes(m.id)} onChange={() => toggleParticipant(m.id)}/><span className="checkmark">✓</span>{m.name}</label>)}{!active.members.length && <span className="no-people">Add members before logging expenses</span>}</div></fieldset><button className="primary-button record-button" disabled={saving || !active.members.length}>{saving ? "Saving…" : "Record expense"}<span>→</span></button></form></section>
            </div>
            <section className="history-section"><div className="section-title"><div><h3>Recent expenses</h3><p>The little things that add up to great memories.</p></div><span className="history-count">{active.expenses.length} {active.expenses.length === 1 ? "entry" : "entries"}</span></div><div className="history-card">{active.expenses.length ? active.expenses.map((expense) => <div className="expense-row" key={expense.id}><span className="expense-row-icon">↗</span><span className="expense-desc"><strong>{expense.description}</strong><small>Paid by {expense.payer.name} · split {expense.participants.length} ways</small></span><span className="expense-date">{new Date(expense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><strong className="expense-amount">{money(expense.amountCents)}</strong></div>) : <div className="empty-history"><span>✳</span><strong>No expenses yet</strong><small>When someone covers a shared cost, log it here.</small></div>}</div></section>
            <footer className="balance-footer"><span>✳</span> Fair splits. Better memories. <span className="zero-check">Balance check: {net === 0 ? "$0.00 ✓" : `${money(net)} !`}</span></footer>
          </>}
        </section>
      </div>
    </main>
  );
}
