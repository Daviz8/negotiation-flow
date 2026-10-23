
import { describe, it, expect } from "vitest";
import {
  createOffer,
  respondToOffer,
  SALE_STATUS,
} from "../src/index.js";

// Create a fresh sale object for each test.
const baseSale = () => {
  return {
    status: SALE_STATUS.SUBMITTED,
    negotiationCount: 0,
    negotiations: [],
    acceptedPrice: 0,
  };
};

describe("Negotiation package", () => {
  it("creates a pending offer and increments the round count", () => {
    const result = createOffer(baseSale(), {
      offerPrice: 50000,
      message: "Offer",
    });

    const saleRequest = result.saleRequest;

    expect(saleRequest.negotiationCount).toBe(1);
    expect(saleRequest.negotiations[0].adminOfferPrice).toBe(50000);
    expect(saleRequest.negotiations[0].sellerResponse).toBe("pending");
    expect(saleRequest.status).toBe(SALE_STATUS.NEGOTIATING);
  });

  it("acceptance stores the accepted price", () => {
    const offered = createOffer(baseSale(), {
      offerPrice: 50000,
    }).saleRequest;

    const result = respondToOffer(offered, {
      response: "accepted",
    });

    const saleRequest = result.saleRequest;

    expect(saleRequest.status).toBe(SALE_STATUS.OFFER_ACCEPTED);
    expect(saleRequest.acceptedPrice).toBe(50000);
  });

  it("rejection with a counter price sets counter_price_sent", () => {
    const offered = createOffer(baseSale(), {
      offerPrice: 50000,
    }).saleRequest;

    const result = respondToOffer(offered, {
      response: "rejected",
      counterPrice: 60000,
      counterMessage: "Can you improve it?",
    });

    const saleRequest = result.saleRequest;

    expect(saleRequest.status).toBe(SALE_STATUS.COUNTER_PRICE_SENT);
    expect(saleRequest.negotiations[0].counterPrice).toBe(60000);
  });

  it("third rejected offer closes the request", () => {
    let sale = baseSale();

    for (let i = 0; i < 5; i++) {
      sale = createOffer(sale, { offerPrice: 50000 + i * 1000,}).saleRequest;
      sale = respondToOffer(sale, {
        response: "rejected",
      }).saleRequest;
    }

    expect(sale.status).toBe(SALE_STATUS.REJECTED);
  });

  it("does not allow invalid offer prices", () => {
    expect(() => {
      createOffer(baseSale(), {
        offerPrice: 0,
      });
    }).toThrow(/greater than zero/);
  });
});
