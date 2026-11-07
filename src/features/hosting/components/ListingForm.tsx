"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { idleState } from "@/lib/forms/form-state";
import { saveListing } from "../actions";
import { HOST_TYPES, PARCEL_SIZES, type ListingField } from "../schemas";
import styles from "./hosting.module.scss";

export type ListingDefaults = {
  hostType: string;
  displayName: string;
  businessName: string;
  rulesText: string;
  maxParcelSize: string;
  maxValueEuros: string;
  capacity: string;
};

type ListingFormProps = { defaults: ListingDefaults; editable: boolean };

export function ListingForm({ defaults, editable }: ListingFormProps) {
  const t = useTranslations("Hosting");
  const [state, formAction, pending] = useActionState(saveListing, idleState);

  const errors = state.status === "error" ? state : undefined;
  // After a failed save, show what the user typed; otherwise the saved values.
  const value = (field: ListingField) => errors?.values?.[field] ?? defaults[field];
  const fieldError = (field: ListingField) => {
    const code = errors?.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };
  const [hostType, setHostType] = useState(value("hostType"));

  return (
    <form
      action={formAction}
      // With JS, dispatch the action ourselves: React resets <form action>
      // forms after every submit, which would put the host-type <select> back
      // to its first option while the page still showed "business". An edit
      // form should keep exactly what the user sees. Without JS, `action`
      // still posts the form normally.
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

        <Field label={t("listing.hostType")} error={fieldError("hostType")}>
          <Select
            name="hostType"
            defaultValue={value("hostType")}
            onChange={(event) => setHostType(event.target.value)}
          >
            {HOST_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`listing.hostTypes.${type}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t("listing.displayName")}
          hint={t("listing.displayNameHint")}
          error={fieldError("displayName")}
        >
          <Input name="displayName" maxLength={60} defaultValue={value("displayName")} />
        </Field>

        {hostType === "business" && (
          <Field label={t("listing.businessName")} error={fieldError("businessName")}>
            <Input
              name="businessName"
              maxLength={120}
              autoComplete="organization"
              defaultValue={value("businessName")}
            />
          </Field>
        )}

        <Field
          label={t("listing.rulesText")}
          hint={t("listing.rulesTextHint")}
          error={fieldError("rulesText")}
        >
          <textarea
            name="rulesText"
            rows={3}
            maxLength={1000}
            className={styles.textarea}
            defaultValue={value("rulesText")}
          />
        </Field>

        <Field label={t("listing.maxParcelSize")} error={fieldError("maxParcelSize")}>
          <Select name="maxParcelSize" defaultValue={value("maxParcelSize")}>
            {PARCEL_SIZES.map((size) => (
              <option key={size} value={size}>
                {t(`listing.sizes.${size}`)}
              </option>
            ))}
          </Select>
        </Field>

        <div className={styles.pair}>
          <Field
            label={t("listing.maxValue")}
            hint={t("listing.maxValueHint")}
            error={fieldError("maxValueEuros")}
          >
            <Input
              name="maxValueEuros"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              step={1}
              defaultValue={value("maxValueEuros")}
            />
          </Field>
          <Field
            label={t("listing.capacity")}
            hint={t("listing.capacityHint")}
            error={fieldError("capacity")}
          >
            <Input
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              step={1}
              defaultValue={value("capacity")}
            />
          </Field>
        </div>

        {editable && (
          <div className={styles.actions}>
            <Button type="submit" loading={pending}>
              {t("listing.save")}
            </Button>
            {state.status === "success" && !pending && (
              <p className={styles.saved} role="status">
                {t("listing.saved")}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}
