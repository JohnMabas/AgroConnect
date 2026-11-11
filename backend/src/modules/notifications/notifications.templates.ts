import { env } from "../../config/env.js";
import type {
  NotificationTemplateVariables,
  NotificationType,
  RenderedNotification,
} from "./notifications.types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return null;
  }
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency ?? "NGN"}`;
}

function actor(variables: NotificationTemplateVariables): string {
  return variables.actor_name?.trim() || "A marketplace participant";
}

function recipient(variables: NotificationTemplateVariables): string {
  return variables.recipient_name?.trim() || "there";
}

function humanize(value: string | null | undefined): string {
  if (!value) return "verification";
  return value.replaceAll("_", " ");
}

function subjectFor(
  type: NotificationType,
  variables: NotificationTemplateVariables,
): { title: string; message: string } {
  const amount = formatAmount(variables.amount, variables.currency);
  const offerNumber = variables.offer_number
    ? ` ${variables.offer_number}`
    : "";
  const orderNumber = variables.order_number
    ? ` ${variables.order_number}`
    : "";
  const deliveryReference = variables.delivery_reference
    ? ` ${variables.delivery_reference}`
    : "";
  const quantity =
    variables.quantity !== null && variables.quantity !== undefined
      ? `${variables.quantity} ${variables.unit ?? ""}`.trim()
      : null;

  switch (type) {
    case "new_offer":
      return {
        title: "New offer received",
        message: `${actor(variables)} sent offer${offerNumber}${
          quantity ? ` for ${quantity}` : ""
        }${amount ? ` at ${amount}` : ""}. Review it and respond before it expires.`,
      };
    case "offer_accepted":
      return {
        title: "Offer accepted",
        message: `${actor(variables)} accepted offer${offerNumber}${
          amount ? ` worth ${amount}` : ""
        }.`,
      };
    case "offer_rejected":
      return {
        title: "Offer declined",
        message: `${actor(variables)} declined offer${offerNumber}.`,
      };
    case "counter_offer_received":
      return {
        title: "Counteroffer received",
        message: `${actor(variables)} sent a counteroffer${offerNumber}${
          amount ? ` at ${amount}` : ""
        }.`,
      };
    case "offer_withdrawn":
      return {
        title: "Offer withdrawn",
        message: `${actor(variables)} withdrew offer${offerNumber}.`,
      };
    case "offer_expired":
      return {
        title: "Offer expired",
        message: `Offer${offerNumber} expired because it was not answered in time.`,
      };
    case "new_message":
      return {
        title: "New message",
        message: `${actor(variables)} sent you a new message${
          variables.message ? `: ${variables.message}` : "."
        }`,
      };
    case "order_created":
      return {
        title: "New order",
        message: `Order${orderNumber} was created${
          amount ? ` for ${amount}` : ""
        }${quantity ? ` (${quantity})` : ""}.`,
      };
    case "order_cancelled":
      return {
        title: "Order cancelled",
        message: `Order${orderNumber} was cancelled${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "payment_successful":
      return {
        title: "Payment received",
        message: `Payment${amount ? ` of ${amount}` : ""} for order${orderNumber} was confirmed.`,
      };
    case "payment_failed":
      return {
        title: "Payment failed",
        message: `Payment for order${orderNumber} was not successful${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "reservation_expiring":
      return {
        title: "Reservation expiring soon",
        message: `Your inventory reservation for order${orderNumber} expires soon. Complete payment to keep your order.`,
      };
    case "reservation_expired":
      return {
        title: "Reservation expired",
        message: `Your reservation for order${orderNumber} expired and the order was cancelled because payment was not completed in time.`,
      };
    case "refund_confirmed":
      return {
        title: "Refund confirmed",
        message: `The refund${amount ? ` of ${amount}` : ""} for order${orderNumber} was confirmed.`,
      };
    case "delivery_assigned":
      return {
        title: "Delivery assigned",
        message: `Delivery${deliveryReference} has an assigned transporter.`,
      };
    case "delivery_accepted":
      return {
        title: "Delivery accepted",
        message: `Transporter ${actor(variables)} accepted delivery${deliveryReference}.`,
      };
    case "delivery_declined":
      return {
        title: "Delivery declined",
        message: `Transporter ${actor(variables)} declined delivery${deliveryReference}${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "delivery_picked_up":
      return {
        title: "Delivery picked up",
        message: `Delivery${deliveryReference} was picked up.`,
      };
    case "delivery_in_transit":
      return {
        title: "Delivery in transit",
        message: `Delivery${deliveryReference} is now in transit.`,
      };
    case "delivery_delivered":
      return {
        title: "Delivery delivered",
        message: `Delivery${deliveryReference} was marked as delivered.`,
      };
    case "delivery_completed":
      return {
        title: "Delivery completed",
        message: `Delivery${deliveryReference} was completed.`,
      };
    case "delivery_failed":
      return {
        title: "Delivery failed",
        message: `Delivery${deliveryReference} failed${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "delivery_cancelled":
      return {
        title: "Delivery cancelled",
        message: `Delivery${deliveryReference} was cancelled${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "account_verified":
      return {
        title: "Account verified",
        message: `Your ${
          variables.verification_method === "phone" ? "phone number" : "email address"
        } was verified successfully.`,
      };
    case "new_review":
      return {
        title: "New review received",
        message: `${actor(variables)} left you a ${
          variables.rating ? `${variables.rating}-star ` : ""
        }review${variables.review_title ? `: ${variables.review_title}` : "."}`,
      };
    case "review_reported":
      return {
        title: "Review reported",
        message: `${actor(variables)} reported a review${
          variables.report_reason
            ? ` for ${humanize(variables.report_reason)}`
            : ""
        }. An administrator will review the report.`,
      };
    case "review_hidden":
      return {
        title: "Review hidden",
        message: `Your review${
          variables.review_title ? ` "${variables.review_title}"` : ""
        } was hidden by an administrator${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "review_restored":
      return {
        title: "Review restored",
        message: `Your review${
          variables.review_title ? ` "${variables.review_title}"` : ""
        } was restored and is visible again.`,
      };
    case "review_report_resolved":
      return {
        title: "Review report resolved",
        message: `The review report you submitted was resolved${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "review_report_dismissed":
      return {
        title: "Review report dismissed",
        message: `The review report you submitted was dismissed${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "agent_invited":
      return {
        title: "Cooperative agent invitation",
        message: `${actor(variables)} invited you to act as an agent for their cooperative. Complete verification before assisting farmers.`,
      };
    case "agent_verification_approved":
      return {
        title: "Agent verification approved",
        message: "Your cooperative agent verification was approved. You can now request farmer consent.",
      };
    case "agent_verification_rejected":
      return {
        title: "Agent verification rejected",
        message: `Your cooperative agent verification was rejected${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "agent_relationship_requested":
      return {
        title: "Farmer consent requested",
        message: `${actor(variables)} requested permission to assist with your farm activities. Review the request and grant only the permissions you approve.`,
      };
    case "agent_relationship_approved":
      return {
        title: "Farmer consent granted",
        message: `${actor(variables)} granted you permission to assist with their farm activities.`,
      };
    case "agent_relationship_revoked":
      return {
        title: "Farmer consent revoked",
        message: `${actor(variables)} revoked your permission to assist with their farm activities${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "action_approval_requested":
      return {
        title: "Action approval requested",
        message: `${actor(variables)} requested your approval for ${humanize(
          variables.action_type,
        )}. No change will be made unless you approve it.`,
      };
    case "action_approved":
      return {
        title: "Action approved",
        message: `The farmer approved ${humanize(variables.action_type)}.`,
      };
    case "action_rejected":
      return {
        title: "Action rejected",
        message: `The farmer rejected ${humanize(variables.action_type)}${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "action_approval_expired":
      return {
        title: "Action approval expired",
        message: `The approval request for ${humanize(
          variables.action_type,
        )} expired without farmer consent.`,
      };
    case "complaint_submitted":
      return {
        title: "Complaint received",
        message: `Complaint${
          variables.complaint_number ? ` ${variables.complaint_number}` : ""
        } was received and will be reviewed by an administrator.`,
      };
    case "complaint_status_updated":
      return {
        title: "Complaint status updated",
        message: `Complaint${
          variables.complaint_number ? ` ${variables.complaint_number}` : ""
        } is now ${humanize(variables.reason)}.`,
      };
    case "complaint_resolved":
      return {
        title: "Complaint resolved",
        message: `Complaint${
          variables.complaint_number ? ` ${variables.complaint_number}` : ""
        } was resolved${variables.reason ? `: ${variables.reason}` : "."}`,
      };
    case "verification_submitted":
      return {
        title: "Verification submitted",
        message: `Your ${humanize(variables.verification_type)} verification request was submitted and is awaiting review.`,
      };
    case "verification_approved":
      return {
        title: "Verification approved",
        message: `Your ${humanize(variables.verification_type)} verification was approved.`,
      };
    case "verification_rejected":
      return {
        title: "Verification rejected",
        message: `Your ${humanize(variables.verification_type)} verification was rejected${
          variables.reason ? `: ${variables.reason}` : "."
        }`,
      };
    case "market_observation_submitted":
      return {
        title: "Market observation submitted",
        message: `${actor(variables)} submitted a market observation${
          variables.produce_name ? ` for ${variables.produce_name}` : ""
        }${amount ? ` at ${amount}` : ""}${
          variables.market_name ? ` in ${variables.market_name}` : ""
        }. It is awaiting review.`,
      };
    case "market_observation_approved":
      return {
        title: "Market observation approved",
        message: `Your market observation${
          variables.produce_name ? ` for ${variables.produce_name}` : ""
        }${amount ? ` at ${amount}` : ""} was approved and now contributes to verified market prices.`,
      };
    case "market_observation_rejected":
      return {
        title: "Market observation rejected",
        message: `Your market observation${
          variables.produce_name ? ` for ${variables.produce_name}` : ""
        } was rejected${variables.reason ? `: ${variables.reason}` : "."}`,
      };
    case "system_announcement":
    case "marketing":
      return {
        title: variables.title?.trim() || "AgroConnect update",
        message: variables.message?.trim() || "You have a new update from AgroConnect.",
      };
  }
}

function emailHtml(
  title: string,
  message: string,
  actionUrl: string | null,
): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const action = actionUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(
        actionUrl,
      )}" style="background:#1f7a3f;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Open AgroConnect</a></p>`
    : "";
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,sans-serif;color:#203224;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;padding:28px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;color:#1f7a3f;font-size:14px;font-weight:700;letter-spacing:.04em;">AGROCONNECT</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${safeTitle}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#3f5144;">${safeMessage}</p>
                ${action}
                <p style="margin:28px 0 0;font-size:12px;color:#7b8c7f;">This is an automated message from AgroConnect. Please do not reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNotificationTemplate(
  type: NotificationType,
  variables: NotificationTemplateVariables,
): RenderedNotification {
  const { title, message } = subjectFor(type, variables);
  const actionUrl = variables.action_url ?? null;
  const absoluteActionUrl = actionUrl
    ? actionUrl.startsWith("http")
      ? actionUrl
      : `${(env.FRONTEND_URL ?? "").replace(/\/$/, "")}${actionUrl.startsWith("/") ? "" : "/"}${actionUrl}`
    : null;
  const greeting = recipient(variables);

  return {
    title,
    message,
    email_subject: `${title} - AgroConnect`,
    email_text: `Hello ${greeting},\n\n${message}${
      absoluteActionUrl ? `\n\nOpen AgroConnect: ${absoluteActionUrl}` : ""
    }\n\nThis is an automated message from AgroConnect.`,
    email_html: emailHtml(title, message, absoluteActionUrl),
    sms_body: `${title}: ${message}`.slice(0, 480),
  };
}

export function buildChannelContent(notification: {
  title: string;
  message: string;
  action_url: string | null;
}): {
  email_subject: string;
  email_text: string;
  email_html: string;
  sms_body: string;
} {
  const absoluteActionUrl = notification.action_url
    ? notification.action_url.startsWith("http")
      ? notification.action_url
      : `${(env.FRONTEND_URL ?? "").replace(/\/$/, "")}${notification.action_url.startsWith("/") ? "" : "/"}${notification.action_url}`
    : null;
  return {
    email_subject: `${notification.title} - AgroConnect`,
    email_text: `Hello,\n\n${notification.message}${
      absoluteActionUrl ? `\n\nOpen AgroConnect: ${absoluteActionUrl}` : ""
    }\n\nThis is an automated message from AgroConnect.`,
    email_html: emailHtml(
      notification.title,
      notification.message,
      absoluteActionUrl,
    ),
    sms_body: `${notification.title}: ${notification.message}`.slice(0, 480),
  };
}
