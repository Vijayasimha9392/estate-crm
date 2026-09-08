import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type AriaAttributes,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";

import { api, ApiError } from "./api";

export const label = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const date = (value: string | null | undefined) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not scheduled";

export function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {label(value)}
    </span>
  );
}

export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />

      <span>
        {error instanceof Error ? error.message : String(error)}
      </span>

      {retry && (
        <button className="link" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      Loading workspace…
    </div>
  );
}

export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />

      <h3>{title}</h3>

      <p>{detail}</p>

      {action}
    </div>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>

        <h1>{title}</h1>

        <p>{description}</p>
      </div>

      {action}
    </div>
  );
}

export function Field({
  label: caption,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: ApiError | null;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {caption}
      </label>

      {isValidElement<AriaAttributes>(children)
        ? cloneElement(children, {
            "aria-invalid": error?.fields[name]
              ? true
              : undefined,

            "aria-describedby": error?.fields[name]
              ? name + "-error"
              : undefined,
          })
        : children}

      {error?.fields[name] && (
        <small
          className="field-error"
          id={name + "-error"}
        >
          {error.fields[name]}
        </small>
      )}
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;

    node?.showModal();

    return () => {
      node?.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-title">
        <h2 id="dialog-title">
          {title}
        </h2>

        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      {children}
    </dialog>
  );
}

export function Submit({
  busy,
  children = "Save changes",
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      className="button primary"
      type="submit"
      disabled={busy}
    >
      {busy ? (
        <>
          <LoaderCircle
            size={16}
            className="spin"
          />

          Saving…
        </>
      ) : (
        <>
          {children}

          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

/*
 * In-memory cache for GET requests.
 *
 * This prevents pages such as Overview, Leads,
 * Properties and Bookings from displaying the
 * loading screen every time the user navigates
 * back to a page that was already loaded.
 */
const remoteCache = new Map<string, unknown>();

export function useRemote<T>(path: string) {
  const hasCachedData = remoteCache.has(path);

  const [data, setData] = useState<T | null>(() => {
    if (!hasCachedData) {
      return null;
    }

    return remoteCache.get(path) as T;
  });

  const [error, setError] =
    useState<unknown>(null);

  const [loading, setLoading] =
    useState(!hasCachedData);

  const [version, setVersion] =
    useState(0);

  useEffect(() => {
    const controller =
      new AbortController();

    const cachedData =
      remoteCache.get(path) as T | undefined;

    /*
     * If this page has already been loaded,
     * immediately display the cached data.
     *
     * A background request is still made so
     * the page can receive fresh information.
     */
    if (cachedData !== undefined) {
      setData(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);

    api<T>(
      path,
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        remoteCache.set(path, result);

        setData(result);
        setError(null);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }

        /*
         * If cached data exists, keep showing it
         * instead of replacing the whole page
         * with an error during a temporary
         * backend/network issue.
         */
        if (!remoteCache.has(path)) {
          setError(requestError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [path, version]);

  function reload() {
    remoteCache.delete(path);

    setData(null);
    setError(null);
    setLoading(true);

    setVersion((current) => current + 1);
  }

  return {
    data,
    error,
    loading,
    reload,
  };
}