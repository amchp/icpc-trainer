import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Button, Card, FieldLabel, Input, Label, Separator } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { ConnectJudgesFormHeader } from "./ConnectJudgesFormHeader.js";
import { formatConnectJudgeError } from "./connectJudgeErrors.js";
import {
  type ProviderConnectJudgeFormProps
} from "./connectJudgesShared.js";
import { useToaster } from "./Toaster.js";
import { trpc } from "./trpc.js";

type QojCookieKey =
  | "uoj_remember_token"
  | "uoj_remember_token_checksum"
  | "uoj_username"
  | "uoj_username_checksum"
  | "uojsessid";

const qojCookieKeys: Array<{ readonly key: QojCookieKey; readonly label: string }> = [
  { key: "uoj_remember_token", label: "uoj_remember_token" },
  { key: "uoj_remember_token_checksum", label: "uoj_remember_token_checksum" },
  { key: "uoj_username_checksum", label: "uoj_username_checksum" },
  { key: "uojsessid", label: "uojsessid" }
];

const emptyQojCookies = (): Record<QojCookieKey, string> => ({
  uoj_remember_token: "",
  uoj_remember_token_checksum: "",
  uoj_username: "",
  uoj_username_checksum: "",
  uojsessid: ""
});

const buildQojCookieJar = (values: Record<QojCookieKey, string>, handle: string): string =>
  [
    { key: "uoj_remember_token" as const },
    { key: "uoj_remember_token_checksum" as const },
    { key: "uoj_username" as const },
    { key: "uoj_username_checksum" as const },
    { key: "uojsessid" as const }
  ]
    .map(({ key }) => [key, values[key].trim()] as const)
    .map(([key, value]) => [key, key === "uoj_username" ? handle.trim() : value] as const)
    .filter((entry) => entry[1] !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

export function QojConnectJudgeForm({ onChangeProvider }: ProviderConnectJudgeFormProps): React.JSX.Element {
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
        const status = await trpc.credentials.save.mutate({
          provider: "qoj",
          providerUserKey: value.handle,
          qoj: {
            cookieJar: buildQojCookieJar(value.qojCookies, value.handle)
          }
        });
        setCredentialStatus(status);
        void navigate({ to: "/judges" });
      } catch (error) {
        toaster.error({
          title: "Could not connect QOJ",
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
            <ConnectJudgesFormHeader title="QOJ" disabled={isSubmitting} onChangeProvider={onChangeProvider} />
          )}
        </form.Subscribe>
        <Separator />

        <div className="space-y-4 p-5">
          <form.Field name="handle">
            {(field) => (
              <Label>
                <FieldLabel>Handle</FieldLabel>
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

          <div className="grid gap-3 sm:grid-cols-2">
            {qojCookieKeys.map((cookie) => (
              <form.Field key={cookie.key} name={`qojCookies.${cookie.key}` as const}>
                {(field) => (
                  <Label>
                    <FieldLabel>{cookie.label}</FieldLabel>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder={cookie.label}
                      autoComplete="off"
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
                Enter
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Card>
  );
}
