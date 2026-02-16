import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { addMinutes, differenceInMinutes, format, startOfWeek } from "date-fns";
import { srLatn } from "date-fns/locale";
import { db } from "../../firebase";
import ReservationCalendar, {
  CalendarEvent,
} from "../components/ReservationCalendar";
import {
  defaultWorkingHours,
  getDayConfig,
  isDateInVacation,
  isWithinWorkingHours,
  normalizeWorkingHours,
  WorkingHours,
} from "../../utils/workingHours";

export type ReservationDoc = {
  id?: string;
  userId?: string | null;
  serviceId?: string | null;
  cardColor?: string | null;
  kind?: "user" | "guest" | "break";
  guestName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMin?: number;
};

type UserDoc = {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  disabled?: boolean;
  verified?: boolean;
};

type ServiceDoc = {
  id: string;
  name?: string;
};

type FormState = {
  kind: "user" | "guest" | "break";
  userId: string;
  serviceId: string;
  cardColor: string;
  guestName: string;
  date: string;
  startTime: string;
  duration: "30" | "60";
};

const USER_CARD_COLORS = ["#3b82f6", "#10b981", "#f97316", "#a855f7"] as const;
const GUEST_CARD_COLORS = ["#93c5fd", "#10b981", "#f97316", "#a855f7"] as const;
const DEFAULT_COLOR_BY_KIND = {
  user: USER_CARD_COLORS[0],
  guest: GUEST_CARD_COLORS[0],
  break: "#6b7280",
} as const;

const emptyForm: FormState = {
  kind: "guest",
  userId: "",
  serviceId: "",
  cardColor: DEFAULT_COLOR_BY_KIND.guest,
  guestName: "",
  date: "",
  startTime: "",
  duration: "30",
};

const AdminReservationsPage = () => {
  const [reservations, setReservations] = useState<ReservationDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [infoReservationId, setInfoReservationId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loadingReservations, setLoadingReservations] = useState<boolean>(true);
  const highlightTimerRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);
  const [userQuery, setUserQuery] = useState("");
  const [workingHours, setWorkingHours] =
    useState<WorkingHours>(defaultWorkingHours);

  useEffect(() => {
    const start = weekStart;
    const end = addMinutes(start, 6 * 24 * 60);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const q = query(
      collection(db, "reservations"),
      where("date", ">=", startStr),
      where("date", "<=", endStr),
    );
    setLoadingReservations(true);
    const unsub = onSnapshot(q, (snap) => {
      const list: ReservationDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as ReservationDoc;
        list.push({ ...data, id: d.id });
      });
      setReservations(list);
      setLoadingReservations(false);

      if (!initialLoadRef.current) {
        const added = snap.docChanges().find((c) => c.type === "added");
        if (added) {
          setHighlightId(added.doc.id);
          if (highlightTimerRef.current) {
            window.clearTimeout(highlightTimerRef.current);
          }
          highlightTimerRef.current = window.setTimeout(() => {
            setHighlightId(null);
            highlightTimerRef.current = null;
          }, 3000);
        }
      }

      if (initialLoadRef.current) initialLoadRef.current = false;
    });
    return unsub;
  }, [weekStart]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<UserDoc, "id">;
        if (data.disabled) return;
        if (!data.verified) return;
        list.push({ id: d.id, ...data });
      });
      setUsers(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "services"), (snap) => {
      const list: ServiceDoc[] = [];
      snap.forEach((d) =>
        list.push({ id: d.id, ...(d.data() as Omit<ServiceDoc, "id">) }),
      );
      setServices(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "workingHours"), (snap) => {
      if (snap.exists()) {
        setWorkingHours(normalizeWorkingHours(snap.data() as WorkingHours));
      } else {
        setWorkingHours(defaultWorkingHours);
      }
    });
    return unsub;
  }, []);

  const usersById = useMemo(() => {
    const map = new Map<string, UserDoc>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);
  const servicesById = useMemo(() => {
    const map = new Map<string, ServiceDoc>();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  const toDateTime = (date?: string, time?: string) => {
    if (!date || !time) return null;
    if (time.includes("T")) {
      const dt = new Date(time);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(`${date}T${time}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const buildSlotId = (date: string, time: string) => `${date}_${time}`;

  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map((r) => {
      const start = toDateTime(r.date, r.startTime) ?? new Date();
      const end =
        toDateTime(r.date, r.endTime) ?? addMinutes(start, r.durationMin ?? 60);
      const kind =
        r.kind ?? (r.userId ? "user" : r.guestName ? "guest" : "break");
      const user = r.userId ? usersById.get(r.userId) : undefined;
      const title =
        kind === "break"
          ? "Pauza"
          : kind === "guest"
            ? r.guestName || "Guest"
            : user?.fullName || user?.email || "Korisnik";
      return {
        id:
          r.id ||
          `${r.userId || r.guestName || "break"}-${r.startTime || "time"}`,
        title,
        start,
        end,
        color: r.cardColor || DEFAULT_COLOR_BY_KIND[kind],
      };
    });
  }, [reservations, usersById]);

  const openCreate = (dt: Date) => {
    setInfoReservationId(null);
    setError(null);
    setForm({
      ...emptyForm,
      kind: "guest",
      cardColor: DEFAULT_COLOR_BY_KIND.guest,
      date: format(dt, "yyyy-MM-dd"),
      startTime: format(dt, "HH:mm"),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setError(null);
  };

  const openInfo = (ev: CalendarEvent) => {
    if (modalOpen) closeModal();
    setError(null);
    setInfoReservationId(ev.id);
  };

  const saveReservation = async () => {
    if (!form.date || !form.startTime) {
      setError("Popunite sva obavezna polja.");
      return;
    }
    if (form.kind === "user" && !form.userId) {
      setError("Izaberite korisnika.");
      return;
    }
    if (form.kind === "guest" && !form.guestName.trim()) {
      setError("Unesite ime gosta.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const start = new Date(`${form.date}T${form.startTime}`);
      const duration = Number(form.duration);
      const end = addMinutes(start, duration);
      const expireAtDate = new Date(`${form.date}T00:00:00`);
      expireAtDate.setDate(expireAtDate.getDate() + 90);
      const payload = {
        kind: form.kind,
        userId: form.kind === "user" ? form.userId : null,
        guestName: form.kind === "guest" ? form.guestName.trim() : null,
        serviceId: form.kind === "break" ? null : form.serviceId || null,
        cardColor:
          form.kind === "break"
            ? DEFAULT_COLOR_BY_KIND.break
            : form.cardColor || null,
        date: format(start, "yyyy-MM-dd"),
        startTime: format(start, "HH:mm"),
        endTime: format(end, "HH:mm"),
        durationMin: duration,
        expireAt: Timestamp.fromDate(expireAtDate),
      };

      const createdId = await runTransaction(db, async (tx) => {
        const newSlotId = buildSlotId(payload.date, payload.startTime);
        const slotRef = doc(db, "slots", newSlotId);
        const slotSnap = await tx.get(slotRef);
        if (slotSnap.exists()) {
          throw new Error("SLOT_TAKEN");
        }
        const resRef = doc(collection(db, "reservations"));
        tx.set(slotRef, {
          date: payload.date,
          startTime: payload.startTime,
          reservationId: resRef.id,
          createdAt: new Date(),
        });
        tx.set(resRef, payload);
        return resRef.id;
      });
      setHighlightId(createdId);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightId(null);
        highlightTimerRef.current = null;
      }, 3000);
      closeModal();
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === "SLOT_TAKEN") {
        setError("Termin je već zauzet. Izaberite drugo vreme.");
      } else {
        setError("Greška pri čuvanju termina.");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteReservationFromInfo = async () => {
    if (!infoReservation?.id) return;
    setSaving(true);
    setError(null);
    try {
      const slotId =
        infoReservation.date && infoReservation.startTime
          ? buildSlotId(infoReservation.date, infoReservation.startTime)
          : null;
      await runTransaction(db, async (tx) => {
        tx.delete(doc(db, "reservations", infoReservation.id!));
        if (slotId) {
          tx.delete(doc(db, "slots", slotId));
        }
      });
      setInfoReservationId(null);
    } catch (e) {
      console.error(e);
      setError("Greška pri brisanju rezervacije.");
    } finally {
      setSaving(false);
    }
  };

  const moveReservation = async (
    ev: CalendarEvent,
    nextStart: Date,
    nextEnd: Date,
  ) => {
    const res = reservations.find((r) => r.id === ev.id);
    if (!res?.id) return;
    try {
      const nextDate = format(nextStart, "yyyy-MM-dd");
      const nextTime = format(nextStart, "HH:mm");
      const nextEndTime = format(nextEnd, "HH:mm");
      const expireAtDate = new Date(`${nextDate}T00:00:00`);
      expireAtDate.setDate(expireAtDate.getDate() + 90);
      const duration = Math.max(30, differenceInMinutes(nextEnd, nextStart));
      if (isDateInVacation(nextStart, workingHours)) {
        setError("Salon je na odmoru u izabranom periodu.");
        return;
      }
      const dayConfig = getDayConfig(nextStart, workingHours);
      if (!isWithinWorkingHours(dayConfig, nextTime, duration)) {
        setError("Termin je van radnog vremena.");
        return;
      }
      const oldSlotId =
        res.date && res.startTime ? buildSlotId(res.date, res.startTime) : null;
      const newSlotId = buildSlotId(nextDate, nextTime);

      await runTransaction(db, async (tx) => {
        const resRef = doc(db, "reservations", res.id!);
        if (oldSlotId && oldSlotId !== newSlotId) {
          const newSlotRef = doc(db, "slots", newSlotId);
          const newSlotSnap = await tx.get(newSlotRef);
          if (newSlotSnap.exists()) {
            throw new Error("SLOT_TAKEN");
          }
          tx.set(newSlotRef, {
            date: nextDate,
            startTime: nextTime,
            reservationId: res.id,
            updatedAt: new Date(),
          });
          tx.delete(doc(db, "slots", oldSlotId));
        }
        tx.update(resRef, {
          date: nextDate,
          startTime: nextTime,
          endTime: nextEndTime,
          expireAt: Timestamp.fromDate(expireAtDate),
        });
      });
    } catch (e) {
      console.error(e);
    }
  };

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      label: u.fullName || u.email || u.id,
    }));
  }, [users]);

  const selectedUser = useMemo(() => {
    if (!form.userId) return null;
    return userOptions.find((u) => u.id === form.userId) ?? null;
  }, [form.userId, userOptions]);

  const filteredUserOptions = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return userOptions;
    return userOptions.filter((u) => u.label.toLowerCase().includes(q));
  }, [userOptions, userQuery]);

  const minHour = 9;
  const maxHour = 20;
  const infoReservation = useMemo(() => {
    if (!infoReservationId) return null;
    return reservations.find((r) => r.id === infoReservationId) ?? null;
  }, [infoReservationId, reservations]);
  const infoKind = useMemo<"user" | "guest" | "break">(() => {
    if (!infoReservation) return "guest";
    return (
      infoReservation.kind ??
      (infoReservation.userId
        ? "user"
        : infoReservation.guestName
          ? "guest"
          : "break")
    );
  }, [infoReservation]);
  const infoUser = useMemo(() => {
    if (!infoReservation?.userId) return null;
    return usersById.get(infoReservation.userId) ?? null;
  }, [infoReservation, usersById]);
  const infoDateTime = useMemo(() => {
    if (!infoReservation) return null;
    return toDateTime(infoReservation.date, infoReservation.startTime);
  }, [infoReservation]);
  const infoDuration = useMemo(() => {
    if (!infoReservation) return null;
    if (infoReservation.durationMin) return infoReservation.durationMin;
    const start = toDateTime(infoReservation.date, infoReservation.startTime);
    const end = toDateTime(infoReservation.date, infoReservation.endTime);
    if (!start || !end) return null;
    return Math.max(30, differenceInMinutes(end, start));
  }, [infoReservation]);
  const infoServiceName = useMemo(() => {
    if (!infoReservation?.serviceId) return null;
    return servicesById.get(infoReservation.serviceId)?.name || null;
  }, [infoReservation, servicesById]);
  const createSlotInfo = useMemo(() => {
    if (!form.date || !form.startTime) return "";
    const dt = new Date(`${form.date}T${form.startTime}`);
    if (Number.isNaN(dt.getTime())) return `${form.date} u ${form.startTime}`;
    const label = format(dt, "EEEE, d. MMMM 'u' HH:mm", { locale: srLatn });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [form.date, form.startTime]);
  const selectedCreateDate = useMemo(() => {
    if (!modalOpen || !form.date) return null;
    const dt = new Date(`${form.date}T${form.startTime || "00:00"}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }, [modalOpen, form.date, form.startTime]);
  const selectableCardColors =
    form.kind === "user" ? USER_CARD_COLORS : GUEST_CARD_COLORS;
  const createPopover =
    modalOpen ? (
      <div className="mx-auto w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">
          {createSlotInfo || "Novi termin"}
        </h3>

        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Tip *
            </label>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as FormState["kind"],
                  userId: e.target.value === "user" ? form.userId : "",
                  guestName: e.target.value === "guest" ? form.guestName : "",
                  serviceId: e.target.value === "break" ? "" : form.serviceId,
                  cardColor:
                    DEFAULT_COLOR_BY_KIND[e.target.value as FormState["kind"]],
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="guest">Guest</option>
              <option value="user">Korisnik</option>
              <option value="break">Pauza</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Trajanje *
            </label>
            <select
              value={form.duration}
              onChange={(e) =>
                setForm({
                  ...form,
                  duration: e.target.value as FormState["duration"],
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="30">30 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          {form.kind !== "break" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Boja kartice
              </label>
              <div className="flex items-center gap-2">
                {selectableCardColors.map((color) => {
                  const active = form.cardColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, cardColor: color })}
                      className={`h-7 w-7 rounded-full border-2 transition ${active ? "border-[#111827] scale-110" : "border-white/40"}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Boja ${color}`}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {form.kind === "user" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Korisnik *
              </label>
              <Combobox
                value={selectedUser}
                onChange={(u) => {
                  setForm({ ...form, userId: u?.id ?? "" });
                  setUserQuery("");
                }}
              >
                <div className="relative">
                  <Combobox.Input
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    displayValue={(u: { id: string; label: string } | null) =>
                      u?.label ?? ""
                    }
                    onChange={(e) => {
                      setUserQuery(e.target.value);
                      if (form.userId) setForm({ ...form, userId: "" });
                    }}
                    placeholder="Izaberi korisnika"
                  />
                  <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-gray-200 bg-white text-sm shadow-lg">
                    {filteredUserOptions.length === 0 ? (
                      <div className="px-3 py-2 text-gray-500">
                        Nema rezultata
                      </div>
                    ) : (
                      filteredUserOptions.map((u) => (
                        <Combobox.Option
                          key={u.id}
                          value={u}
                          className={({ active }) =>
                            `cursor-pointer px-3 py-2 ${active ? "bg-blue-50 text-blue-700" : "text-gray-700"}`
                          }
                        >
                          {u.label}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>
          )}

          {form.kind === "guest" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Ime gosta *
              </label>
              <input
                type="text"
                value={form.guestName}
                onChange={(e) =>
                  setForm({ ...form, guestName: e.target.value })
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ime i prezime / nadimak"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={closeModal}
            className="px-3 py-2 rounded border"
            disabled={saving}
          >
            Nazad
          </button>
          <button
            onClick={saveReservation}
            disabled={saving}
            className="px-3 py-2 rounded bg-[#1F50FF] text-white"
          >
            {saving ? "Čuvanje..." : "Sačuvaj"}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="p-2 sm:p-6 md:p-8 bg-gray-50">
      <div className="-mx-2 sm:mx-0">
        <div className="bg-white rounded-none sm:rounded-lg border border-gray-100 shadow-lg p-0 sm:p-2">
          {loadingReservations && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Učitavanje rezervacija...
            </div>
          )}
          <ReservationCalendar
            weekStart={weekStart}
            events={events}
            selectedDate={selectedCreateDate}
            createPopover={createPopover}
            onPrevWeek={() => {
              if (modalOpen) closeModal();
              setInfoReservationId(null);
              setWeekStart(addMinutes(weekStart, -7 * 24 * 60));
            }}
            onNextWeek={() => {
              if (modalOpen) closeModal();
              setInfoReservationId(null);
              setWeekStart(addMinutes(weekStart, 7 * 24 * 60));
            }}
            onCurrentWeek={() => {
              if (modalOpen) closeModal();
              setInfoReservationId(null);
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
            }}
            onSlotClick={openCreate}
            onEventClick={openInfo}
            onEventMove={moveReservation}
            minHour={minHour}
            maxHour={maxHour}
            stepMinutes={30}
            highlightEventId={highlightId}
          />
        </div>
      </div>

      {infoReservation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-100 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900">
              Detalji rezervacije
            </h3>

            <div className="mt-5 space-y-3 text-base text-gray-700">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="font-semibold text-gray-900">Ime:</span>{" "}
                {infoKind === "user"
                  ? infoUser?.fullName || infoUser?.email || "—"
                  : infoReservation.guestName || "Guest"}
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="font-semibold text-gray-900">Telefon:</span>{" "}
                {infoKind === "user" ? infoUser?.phone || "—" : "—"}
              </div>
              {infoKind === "user" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="font-semibold text-gray-900">Usluga:</span>{" "}
                  {infoServiceName || "—"}
                </div>
              )}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="font-semibold text-gray-900">Termin:</span>{" "}
                {infoDateTime
                  ? `${format(infoDateTime, "EEEE, d. MMMM", { locale: srLatn })} u ${format(infoDateTime, "HH:mm")}`
                  : "—"}
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="font-semibold text-gray-900">Trajanje:</span>{" "}
                {infoDuration ? `${infoDuration} min` : "—"}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={deleteReservationFromInfo}
                disabled={saving}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-base text-red-600"
              >
                {saving ? "Brisanje..." : "Obriši"}
              </button>
              <button
                type="button"
                onClick={() => setInfoReservationId(null)}
                className="rounded-lg border px-4 py-2.5 text-base"
                disabled={saving}
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservationsPage;
