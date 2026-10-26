
import { describe, it, expect } from "vitest";
import {
  createOffer,
  respondToOffer,
  SALE_STATUS,
  MAX_NEGOTIATION_ROUNDS
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

//Creating a pending offer.
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

  //Accepting an offer.
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


//Rejecting an offer with a counter-price.
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

  //Rejecting the final allowed round.
  it("third rejected offer closes the request", () => {
    let sale = baseSale();

    for (let i = 0; i < MAX_NEGOTIATION_ROUNDS; i++) {
      sale = createOffer(sale, { offerPrice: 50000 + i * 1000,}).saleRequest;
      sale = respondToOffer(sale, {
        response: "rejected",
      }).saleRequest;
    }

    expect(sale.status).toBe(SALE_STATUS.REJECTED);
  });

  //Rejecting an invalid offer price.
  it("does not allow invalid offer prices", () => {
    expect(() => {
      createOffer(baseSale(), {
        offerPrice: 0,
      });
    }).toThrow(/greater than zero/);
  });
});

//Test invalid offer prices

it("rejects a negative offer price", () => {
  expect(() => {
    createOffer(baseSale(), { offerPrice: -5000 });
  }).toThrow(/greater than zero/);
});

it("rejects a text offer price", () => {
  expect(() => {
    createOffer(baseSale(), { offerPrice: "hello" });
  }).toThrow(/greater than zero/);
});

it("rejects an infinite offer price", () => {
  expect(() => {
    createOffer(baseSale(), { offerPrice: Infinity });
  }).toThrow(/greater than zero/);
});



 //Test the maximum negotiation limit

it("does not allow another offer after the maximum rounds", () => {
  const sale = {
    ...baseSale(),
    negotiationCount: MAX_NEGOTIATION_ROUNDS,
  };

  expect(() => {
    createOffer(sale, { offerPrice: 50000 });
  }).toThrow(/Negotiation limit reached/);
});

//Test that the original sale does not change

it("does not change the original sale when creating an offer", () => {
  const originalSale = baseSale();

  createOffer(originalSale, {
    offerPrice: 50000,
  });

  expect(originalSale.status).toBe(SALE_STATUS.SUBMITTED);
  expect(originalSale.negotiationCount).toBe(0);
  expect(originalSale.negotiations).toEqual([]);
});

//Test that an old pending offer is closed
it("closes an older pending offer before adding a new one", () => {
  const sale = {
    ...baseSale(),
    status: SALE_STATUS.NEGOTIATING,
    negotiationCount: 1,
    negotiations: [
      {
        trialNumber: 1,
        adminOfferPrice: 50000,
        sellerResponse: "pending",
      },
    ],
  };

  const result = createOffer(sale, {
    offerPrice: 55000,
  });

  expect(
    result.saleRequest.negotiations[0].sellerResponse
  ).toBe("rejected");

  expect(
    result.saleRequest.negotiations[1].sellerResponse
  ).toBe("pending");

  expect(result.saleRequest.negotiationCount).toBe(2);
});

//Test that the seller cannot respond without an offer

it("does not allow a response when no offer exists", () => {
  expect(() => {
    respondToOffer(baseSale(), {
      response: "accepted",
    });
  }).toThrow(/No admin offer found/);
});

// Test that an offer cannot be answered twice

it("does not allow the same offer to be answered twice", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  const acceptedSale = respondToOffer(offeredSale, {
    response: "accepted",
  }).saleRequest;

  expect(() => {
    respondToOffer(acceptedSale, {
      response: "rejected",
    });
  }).toThrow(/already been responded to/);
});

//Test invalid seller responses

it("rejects an unsupported seller response", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  expect(() => {
    respondToOffer(offeredSale, {
      response: "maybe",
    });
  }).toThrow(/response must be "accepted" or "rejected"/);
});


//Tests invalid counter price 
it("rejects a negative counter-price", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  expect(() => {
    respondToOffer(offeredSale, {
      response: "rejected",
      counterPrice: -1000,
    });
  }).toThrow(/counterPrice must be/);
});

it("rejects a non-numeric counter-price", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  expect(() => {
    respondToOffer(offeredSale, {
      response: "rejected",
      counterPrice: "hello",
    });
  }).toThrow(/counterPrice must be/);
});

//Test that messages are cleaned up
it("removes extra spaces around an offer message", () => {
  const result = createOffer(baseSale(), {
    offerPrice: 50000,
    message: "  My best offer  ",
  });

  expect(
    result.saleRequest.negotiations[0].message
  ).toBe("My best offer");
});

//Test the exact final round
it("rejects the sale when the final allowed offer is rejected", () => {
  const sale = {
    ...baseSale(),
    negotiationCount: MAX_NEGOTIATION_ROUNDS - 1,
  };

  const offeredSale = createOffer(sale, {
    offerPrice: 50000,
  }).saleRequest;

  const result = respondToOffer(offeredSale, {
    response: "rejected",
  });

  expect(result.saleRequest.negotiationCount).toBe(
    MAX_NEGOTIATION_ROUNDS
  );

  expect(result.saleRequest.status).toBe(SALE_STATUS.REJECTED);
  expect(result.finalRejected).toBe(true);
});

//reject Invalid sale input 

it("rejects a missing sale object", () => {
  expect(() => {
    createOffer(null, { offerPrice: 50000 });
  }).toThrow(/sale must be an object/);
});

//reject NaN as counter-price 
it("rejects NaN as a counter-price", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  expect(() => {
    respondToOffer(offeredSale, {
      response: "rejected",
      counterPrice: NaN,
    });
  }).toThrow=(/counterPrice must be a number/);
});


//Check that the original negotiation history stays unchanged
it("does not modify the original negotiation history", () => {
  const originalSale = {
    ...baseSale(),
    status: SALE_STATUS.NEGOTIATING,
    negotiationCount: 1,
    negotiations: [
      {
        trialNumber: 1,
        adminOfferPrice: 50000,
        sellerResponse: "pending",
      },
    ],
  };

  const originalHistory = structuredClone( originalSale.negotiations);

  createOffer(originalSale, {
    offerPrice: 55000,
  });

  expect(originalSale.negotiations).toEqual(originalHistory);
});

//Check that rejecting an offer without a counter-price
// keeps the correct status

it("continues negotiating when an offer is rejected without a counter-price", () => {
  const offeredSale = createOffer(baseSale(), {
    offerPrice: 50000,
  }).saleRequest;

  const result = respondToOffer(offeredSale, {
    response: "rejected",
  });

  expect(result.saleRequest.status).toBe(SALE_STATUS.NEGOTIATING );

  expect(result.saleRequest.negotiations[0].sellerResponse)
    .toBe("rejected");

  expect(result.finalRejected).toBe(false);
});