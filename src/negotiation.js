

export const MAX_NEGOTIATION_ROUNDS = 5;

export const SALE_STATUS = Object.freeze({
  SUBMITTED: "submitted",
  NEGOTIATING: "negotiating",
  COUNTER_PRICE_SENT: "counter_price_sent",
  OFFER_ACCEPTED: "offer_accepted",
  APPOINTMENT_SCHEDULED: "appointment_scheduled",
  BOUGHT: "bought",
  REJECTED: "rejected",
});

// Checks if the money is valid and greater than zero.
function positiveMoney(value, fieldName) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TypeError(
     ` ${fieldName} must be a number greater than zero.`
    );
  }

  return amount;
}

 // Initialize a new copy of the sale.
function copySale(sale) {
  if (!sale || typeof sale !== "object") {
    throw new TypeError("sale must be an object.");
  }

  const copiedSale = { ...sale };

  // Copy the negotiations array without changing the original array .
  if (Array.isArray(sale.negotiations)) {
    copiedSale.negotiations = sale.negotiations.map((round) => {
      return { ...round };
    });
  } else {
    copiedSale.negotiations = [];
  }

  // Set the negotiation count to zero if it is missing or falsy.
  copiedSale.negotiationCount = Number(sale.negotiationCount || 0);

  return copiedSale;
}

/**
 * Create the next admin offer.
 * The negotiation-flow workflow allows at most 4 rounds.
 * Returns { saleRequest } or throws an Error if no more rounds are allowed.
 */
export function createOffer(saleInput,{ offerPrice, message = "",
   now = new Date() } = {}) {

  const sale = copySale(saleInput);
  const price = positiveMoney(offerPrice, "offerPrice");

  if (sale.negotiationCount >= MAX_NEGOTIATION_ROUNDS) {
    sale.status = SALE_STATUS.REJECTED;

    throw new Error("Negotiation limit reached. This request is rejected.");
  }

  // Close an older unanswered offer before adding a new one (i.e if ).
  sale.negotiations = sale.negotiations.map((round) => {
    if (round.sellerResponse === "pending") {
      return {
        ...round,
        sellerResponse: "rejected",
        respondedAt: now,
      };
    } else {
      return round;
    }
  });

  // Increase the negotiation count by one.
  sale.negotiationCount += 1;

  // Update the sale status.
  sale.status = SALE_STATUS.NEGOTIATING;

  // Add the new offer to the negotiations array.
  sale.negotiations.push({
    trialNumber: sale.negotiationCount,
    adminOfferPrice: price,
    message: String(message || "").trim(),
    sellerResponse: "pending",
    counterPrice: 0,
    counterMessage: "",
    createdAt: now,
  });

  return { saleRequest: sale };
}

/**
 * Record the seller's response to the latest pending offer.
 * response must be "accepted" or "rejected".
 * A positive counterPrice on rejection moves the request to counter_price_sent.
 */
export function respondToOffer(
  saleInput,
  {
    response,
    counterPrice = 0,
    counterMessage = "",
    now = new Date(),
  } = {}
) {
  const sale = copySale(saleInput);

  if (!["accepted", "rejected"].includes(response)) {
    throw new TypeError(
      'response must be "accepted" or "rejected".'
    );
  }

  // Get the latest negotiation round.
  const latest = sale.negotiations.at(-1);

  if (!latest) {
    throw new Error("No admin offer found to respond to.");
  }

  // Make sure this offer has not already been answered.
  if (latest.sellerResponse !== "pending") {
    throw new Error("This offer has already been responded to.");
  }

  // Convert the counter-price to a number.
  const counter = Number(counterPrice || 0);

  if (!Number.isFinite(counter) || counter < 0) {
    throw new TypeError(
      "counterPrice must be zero or a positive number."
    );
  }

  // Record the seller's response and response time.
  latest.sellerResponse = response;
  latest.respondedAt = now;

  // Handle an accepted offer.
  if (response === "accepted") {
    latest.counterPrice = 0;
    latest.counterMessage = "";

    sale.status = SALE_STATUS.OFFER_ACCEPTED;
    sale.acceptedPrice = Number(latest.adminOfferPrice);

    return {
      saleRequest: sale,
      finalRejected: false,
    };
  } else {
    // Handle a rejected offer.
    latest.counterPrice = counter;
    latest.counterMessage = String(counterMessage || "").trim();
  }

  // Check whether the maximum negotiation rounds have been reached.
  if (sale.negotiationCount >= MAX_NEGOTIATION_ROUNDS) {
    sale.status = SALE_STATUS.REJECTED;

    return {
      saleRequest: sale,
      finalRejected: true,
    };
  }

  // Set the appropriate status based on the counter-price.
  if (counter > 0) {
    sale.status = SALE_STATUS.COUNTER_PRICE_SENT;
  } else {
    sale.status = SALE_STATUS.NEGOTIATING;
  }

  return {
    saleRequest: sale,
    finalRejected: false,
  };
}
