"use client";

import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { LocationMap } from "@/components/map/LocationMap";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { idleState } from "@/lib/forms/form-state";
import type { LngLat } from "@/mocks/types";
import { saveLocation } from "../actions";
import { searchAddresses, type AddressSuggestion } from "../geocoding";
import { gridCell, LISBON_CENTER } from "../location";
import type { LocationField } from "../schemas";
import styles from "./hosting.module.scss";

export type LocationDefaults = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  areaLabel: string;
  accessInstructions: string;
  location: LngLat | null;
};

type TextField = Exclude<LocationField, "lng" | "lat">;

type LocationFormProps = { defaults: LocationDefaults; editable: boolean };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: AddressSuggestion[] }
  | { status: "error" };

const SEARCH_DELAY_MS = 400;

export function LocationForm({ defaults, editable }: LocationFormProps) {
  const t = useTranslations("Hosting");
  const id = useId();
  const [state, formAction, pending] = useActionState(saveLocation, idleState);

  const [fields, setFields] = useState<Record<TextField, string>>(() => ({
    addressLine1: defaults.addressLine1,
    addressLine2: defaults.addressLine2,
    postalCode: defaults.postalCode,
    city: defaults.city,
    areaLabel: defaults.areaLabel,
    accessInstructions: defaults.accessInstructions,
  }));
  // `location` is what gets saved (null until the user places the pin);
  // `mapCenter` is where the map should look.
  const [location, setLocation] = useState<LngLat | null>(defaults.location);
  const [mapCenter, setMapCenter] = useState<LngLat>(defaults.location ?? LISBON_CENTER);

  const [query, setQuery] = useState("");
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [geoError, setGeoError] = useState<"denied" | "unavailable" | null>(null);
  const [locating, setLocating] = useState(false);

  // Search after the user stops typing; cancel stale requests.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3 || text === chosenLabel) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading" });
      searchAddresses(text, mapCenter, controller.signal)
        .then((results) => {
          setSearch({ status: "done", results });
          setActive(-1);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== "AbortError") setSearch({ status: "error" });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // mapCenter only biases results; searching again when it moves would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, chosenLabel]);

  const results = search.status === "done" ? search.results : [];
  const listId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${index}`;

  function choose(suggestion: AddressSuggestion) {
    setFields((current) => ({
      ...current,
      addressLine1: suggestion.addressLine1,
      postalCode: suggestion.postalCode || current.postalCode,
      city: suggestion.city || current.city,
      areaLabel: suggestion.areaLabel || current.areaLabel,
    }));
    setLocation(suggestion.location);
    setMapCenter(suggestion.location);
    setQuery(suggestion.label);
    setChosenLabel(suggestion.label);
    setOpen(false);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never submit the form from the search box.
      event.preventDefault();
      const suggestion = results[active] ?? (open ? results[0] : undefined);
      if (suggestion) choose(suggestion);
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("unavailable");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lng: coords.longitude, lat: coords.latitude };
        setLocation(here);
        setMapCenter(here);
        setLocating(false);
      },
      (error) => {
        setGeoError(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const highlight = useMemo(() => (location ? gridCell(location) : null), [location]);

  const errors = state.status === "error" ? state : undefined;
  const fieldError = (field: LocationField) => {
    const code = errors?.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };
  const pinError = fieldError("lng") ?? fieldError("lat");

  const text = (field: TextField) => ({
    name: field,
    value: fields[field],
    onChange: (event: { target: { value: string } }) =>
      setFields((current) => ({ ...current, [field]: event.target.value })),
  });

  const searchStatus =
    search.status === "loading"
      ? t("location.searching")
      : search.status === "error"
        ? t("location.searchFailed")
        : search.status === "done" && open
          ? results.length
            ? t("location.resultsCount", { count: results.length })
            : t("location.noResults")
          : "";

  return (
    <form
      action={formAction}
      // Dispatched from onSubmit so React doesn't reset the form afterwards
      // (the fields are controlled by search results and the map).
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className={styles.form}
      noValidate
    >
      <fieldset disabled={!editable} className={styles.fieldset}>
        {errors?.formError && (
          <Alert variant="error" title={t(`errors.${errors.formError}`)} />
        )}

        <div className={styles.search}>
          <Field label={t("location.search")}>
            <Input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && results.length > 0}
              aria-controls={listId}
              aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
              autoComplete="off"
              placeholder={t("location.searchPlaceholder")}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setChosenLabel(null);
              }}
              onKeyDown={onSearchKeyDown}
              onBlur={() => setOpen(false)}
            />
          </Field>

          {open && results.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={t("location.search")}
              className={styles.results}
            >
              {results.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className={styles.result}
                  // mousedown, not click: runs before the input's blur closes the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(suggestion);
                  }}
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.searchStatus} role="status">
            {searchStatus}
          </p>
          <p className={styles.attribution}>{t("location.attribution")}</p>
        </div>

        <div className={styles.locate}>
          <Button type="button" variant="secondary" loading={locating} onClick={locateMe}>
            <LocateFixed aria-hidden />{" "}
            {locating ? t("location.locating") : t("location.useMyLocation")}
          </Button>
          {geoError && (
            <p className={styles.dayError} role="alert">
              {t(
                geoError === "denied"
                  ? "location.geolocationDenied"
                  : "location.geolocationUnavailable",
              )}
            </p>
          )}
        </div>

        <div className={styles.mapBlock}>
          <LocationMap
            center={mapCenter}
            zoom={defaults.location ? 16 : 13}
            onMove={(center) => {
              setLocation(center);
              setMapCenter(center);
            }}
            highlight={highlight}
            label={t("location.mapLabel")}
          />
          <p className={styles.muted}>{t("location.mapHint")}</p>
          {pinError && (
            <p className={styles.dayError} role="alert">
              {pinError}
            </p>
          )}
          <div className={styles.privacy}>
            <p className={styles.privacyTitle}>{t("location.privacyTitle")}</p>
            <p className={styles.muted}>{t("location.privacyBody")}</p>
          </div>
        </div>

        <input type="hidden" name="lng" value={location?.lng ?? ""} />
        <input type="hidden" name="lat" value={location?.lat ?? ""} />

        <Field label={t("location.addressLine1")} error={fieldError("addressLine1")}>
          <Input autoComplete="address-line1" maxLength={120} {...text("addressLine1")} />
        </Field>
        <Field label={t("location.addressLine2")} error={fieldError("addressLine2")}>
          <Input autoComplete="address-line2" maxLength={120} {...text("addressLine2")} />
        </Field>
        <div className={styles.pair}>
          <Field
            label={t("location.postalCode")}
            hint={t("location.postalCodeHint")}
            error={fieldError("postalCode")}
          >
            <Input
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={8}
              {...text("postalCode")}
            />
          </Field>
          <Field label={t("location.city")} error={fieldError("city")}>
            <Input autoComplete="address-level2" maxLength={80} {...text("city")} />
          </Field>
        </div>
        <Field
          label={t("location.areaLabel")}
          hint={t("location.areaLabelHint")}
          error={fieldError("areaLabel")}
        >
          <Input maxLength={80} {...text("areaLabel")} />
        </Field>
        <Field
          label={t("location.accessInstructions")}
          hint={t("location.accessInstructionsHint")}
          error={fieldError("accessInstructions")}
        >
          <textarea
            rows={2}
            maxLength={500}
            className={styles.textarea}
            {...text("accessInstructions")}
          />
        </Field>

        {editable && (
          <div className={styles.actions}>
            <Button type="submit" loading={pending}>
              {t("location.save")}
            </Button>
            {state.status === "success" && !pending && (
              <p className={styles.saved} role="status">
                {t("location.saved")}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}
