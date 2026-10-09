import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, FieldLabel, Input, Label, Separator, Textarea } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { ConnectJudgesFormHeader } from "./ConnectJudgesFormHeader.js";
import { formatConnectJudgeError } from "./connectJudgeErrors.js";
import { submitFormOnTextareaEnter, type ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";
import { useToaster } from "./Toaster.js";
import { trpc } from "./trpc.js";

const qojCookieKeys = ["__Host-UOJREMEMBER", "__Host-UOJSESSID"] as const;
type QojCookieKey = (typeof qojCookieKeys)[number];

const emptyQojCookies = (): Record<QojCookieKey, string> => ({
  "__Host-UOJREMEMBER": "",
  "__Host-UOJSESSID": ""
});

const buildQojCookieJar = (values: Record<QojCookieKey, string>): string =>
  qojCookieKeys
    .map((key) => [key, values[key].trim()] as const)
    .filter((entry) => entry[1] !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

export function QojConnectJudgeForm({
  onChangeProvider,
  tutorialUrl
}: ProviderConnectJudgeFormProps): React.JSX.Element {
  const { t } = useTranslation("judges");
  const navigate = useNavigate();
  const { setCredentialStatus } = useConnectedJudges();
  const toaster = useToaster();

  const form = useForm({
    defaultValues: {
      handle: "",
      qojCookies: emptyQojCookies()
    },
    onSubmit: async ({ value }) => {
      try {
        const status = await trpc.credentials.create.mutate({
          provider: "qoj",
          providerUserKey: value.handle,
          qoj: {
            cookieJar: buildQojCookieJar(value.qojCookies)
          }
        });
        setCredentialStatus(status);
        void navigate({ to: "/judges" });
      } catch (error) {
        toaster.error({
          title: t("connectError", { judge: "QOJ" }),
          description: formatConnectJudgeError(error)
        });
      }
    }
  });

  return (
    <Card className="overflow-hidden">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <ConnectJudgesFormHeader
              title="QOJ"
              disabled={isSubmitting}
              onChangeProvider={onChangeProvider}
              tutorialUrl={tutorialUrl}
            />
          )}
        </form.Subscribe>
        <Separator />

        <div className="space-y-4 p-5">
          <form.Field name="handle">
            {(field) => (
              <Label>
                <FieldLabel>{t("handle")}</FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="qoj_handle"
                  autoComplete="username"
                  disabled={form.state.isSubmitting}
                  required
                />
              </Label>
            )}
          </form.Field>

          <div className="space-y-3">
            {qojCookieKeys.map((cookie) => (
              <form.Field key={cookie} name={`qojCookies.${cookie}` as const}>
                {(field) => (
                  <Label>
                    <FieldLabel>{cookie}</FieldLabel>
                    <Textarea
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onKeyDown={(event) => submitFormOnTextareaEnter(event, form.state.isSubmitting)}
                      placeholder={cookie}
                      autoComplete="off"
                      spellCheck={false}
                      className="min-h-20 font-mono text-xs leading-relaxed"
                      disabled={form.state.isSubmitting}
                    />
                  </Label>
                )}
              </form.Field>
            ))}
          </div>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t("enter")}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Card>
  );
}
