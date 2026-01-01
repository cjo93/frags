"use client";

import { FormEvent, useMemo, useState } from "react";

export type BirthFormValues = {
  date: string;
  time?: string;
  timeUtc?: string;
  tzIana: string;
  latitude?: string;
  longitude?: string;
  altitude?: string;
  fidelity?: "LOW" | "MEDIUM" | "HIGH";
};

export type ProfileFormValues = {
  displayName: string;
  notes?: string;
  birthData?: BirthFormValues;
};

interface ProfileFormProps {
  initial?: ProfileFormValues;
  actionUrl: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  resetOnSuccess?: boolean;
}

const fidelityOptions: BirthFormValues["fidelity"][] = ["LOW", "MEDIUM", "HIGH"];

export function ProfileForm({
  initial,
  actionUrl,
  method,
  submitLabel,
  resetOnSuccess
}: ProfileFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [birthEnabled, setBirthEnabled] = useState(Boolean(initial?.birthData));
  const shouldReset = resetOnSuccess ?? method === "POST";

  const defaultBirth = useMemo(() => initial?.birthData ?? null, [initial]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const formData = new FormData(event.currentTarget);
    const displayNameEntry = formData.get("displayName");
    if (!displayNameEntry) {
      throw new Error("Display name is required");
    }

    const payload: any = {
      displayName: String(displayNameEntry),
      notes: formData.get("notes") ? String(formData.get("notes")) : undefined
    };

    if (birthEnabled) {
      payload.birthData = {
        date: String(formData.get("date")),
        time: formData.get("time") ? String(formData.get("time")) : undefined,
        tzIana: String(formData.get("tzIana")),
        timeUtc: formData.get("timeUtc") ? String(formData.get("timeUtc")) : undefined,
        latitude: formData.get("latitude")
          ? Number(formData.get("latitude"))
          : undefined,
        longitude: formData.get("longitude")
          ? Number(formData.get("longitude"))
          : undefined,
        altitude: formData.get("altitude")
          ? Number(formData.get("altitude"))
          : undefined,
        fidelity: formData.get("fidelity")
          ? (String(formData.get("fidelity")) as BirthFormValues["fidelity"])
          : undefined
      };
    }

    try {
      const response = await fetch(actionUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || "Unable to save profile");
      }

      setStatus("Saved successfully");
      if (shouldReset) {
        event.currentTarget.reset();
        setBirthEnabled(false);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Display name</label>
        <input
          name="displayName"
          defaultValue={initial?.displayName}
          required
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          defaultValue={initial?.notes}
          rows={3}
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="birth-enabled"
          type="checkbox"
          checked={birthEnabled}
          onChange={(event) => setBirthEnabled(event.target.checked)}
        />
        <label htmlFor="birth-enabled" className="text-sm font-medium">
          Include birth data
        </label>
      </div>
      {birthEnabled && (
        <div className="space-y-2 rounded border p-3">
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={defaultBirth?.date ?? ""}
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Time (optional)</label>
            <input
              name="time"
              type="text"
              defaultValue={defaultBirth?.time ?? ""}
              className="mt-1 block w-full rounded border px-2 py-1"
              placeholder="hh:mm:ss"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Timezone (tzdb)</label>
            <input
              name="tzIana"
              required
              defaultValue={defaultBirth?.tzIana ?? ""}
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">UTC datetime (optional)</label>
            <input
              name="timeUtc"
              type="datetime-local"
              defaultValue={defaultBirth?.timeUtc ?? ""}
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium">Latitude</label>
              <input
                name="latitude"
                type="number"
                step="0.0001"
                defaultValue={defaultBirth?.latitude ?? ""}
                className="mt-1 block w-full rounded border px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Longitude</label>
              <input
                name="longitude"
                type="number"
                step="0.0001"
                defaultValue={defaultBirth?.longitude ?? ""}
                className="mt-1 block w-full rounded border px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Altitude</label>
              <input
                name="altitude"
                type="number"
                step="1"
                defaultValue={defaultBirth?.altitude ?? ""}
                className="mt-1 block w-full rounded border px-2 py-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Fidelity</label>
            <select
              name="fidelity"
              defaultValue={defaultBirth?.fidelity ?? "MEDIUM"}
              className="mt-1 block w-full rounded border px-2 py-1"
            >
              {fidelityOptions.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-600"
        >
          {submitLabel}
        </button>
        {status && <p className="text-sm text-gray-800">{status}</p>}
      </div>
    </form>
  );
}
