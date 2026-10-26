# negotiation-flow

A lightweight, framework-independent JavaScript package for managing price negotiations between an administrator and a seller.

`negotiation-flow` helps you create offers, record seller responses, track negotiation rounds, and manage negotiation statuses without depending on a database or web framework.

## Features

- Create price offers.
- Accept or reject offers.
- Submit counter-prices.
- Track negotiation rounds.
- Automatically close previous unanswered offers.
- Prevent responses to offers that have already been answered.
- Enforce a configurable maximum negotiation-round limit through `MAX_NEGOTIATION_ROUNDS`.
- Avoid directly modifying the original sale object when updating negotiation data.
- Works with JavaScript applications without requiring a specific framework.

## Installation

Install the package using npm:

```bash
npm install negotiation-flow
```

## Quick Start

```js
import { createOffer, respondToOffer, SALE_STATUS } from "negotiation-flow";

const sale = {
  status: SALE_STATUS.SUBMITTED,
  negotiationCount: 0,
  negotiations: [],
  acceptedPrice: 0,
};

// Administrator creates an offer.
const offerResult = createOffer(sale, {
  offerPrice: 50000,
  message: "My offer for this item",
});

const saleWithOffer = offerResult.saleRequest;

console.log(saleWithOffer.status);
// "negotiating"

// Seller accepts the offer.
const responseResult = respondToOffer(saleWithOffer, {
  response: "accepted",
});

console.log(responseResult.saleRequest.status);
// "offer_accepted"

console.log(responseResult.saleRequest.acceptedPrice);
// 50000
```

## API Reference

### `createOffer(sale, options)`

Creates a new administrator offer.

**Parameters**

- `sale`: The sale object to update.
- `options.offerPrice`: The offered price. Must be a finite number greater than zero.
- `options.message`: Optional message explaining the offer. Defaults to an empty string.
- `options.now`: Optional date or timestamp value used for the creation time. Defaults to `new Date()`.

**Returns**

An object containing the updated sale:

```js
{
  saleRequest: updatedSale;
}
```

Throws an error if the sale is invalid, the offer price is invalid, or the maximum number of negotiation rounds has already been reached.

### `respondToOffer(sale, options)`

Records the seller's response to the latest pending offer.

**Parameters**

- `sale`: The sale object containing the negotiation history.
- `options.response`: Required. Must be `"accepted"` or `"rejected"`.
- `options.counterPrice`: Optional counter-price. Defaults to `0`.
- `options.counterMessage`: Optional explanation for the counter-price. Defaults to an empty string.
- `options.now`: Optional date or timestamp value used for the response time. Defaults to `new Date()`.

**Returns**

An object containing:

```js
{
  saleRequest: updatedSale,
  finalRejected: false
}
```

`finalRejected` becomes `true` when the seller rejects the final allowed offer. The updated sale status then becomes `"rejected"`.

The function throws an error if there is no offer to respond to, the latest offer has already been answered, the response is unsupported, or the counter-price is invalid.

### `MAX_NEGOTIATION_ROUNDS`

The maximum number of negotiation rounds allowed.

```js
import { MAX_NEGOTIATION_ROUNDS } from "negotiation-flow";

console.log(MAX_NEGOTIATION_ROUNDS);
// 5
```

### `SALE_STATUS`

An object containing the supported sale statuses:

- `SUBMITTED`: `"submitted"`
- `NEGOTIATING`: `"negotiating"`
- `COUNTER_PRICE_SENT`: `"counter_price_sent"`
- `OFFER_ACCEPTED`: `"offer_accepted"`
- `APPOINTMENT_SCHEDULED`: `"appointment_scheduled"`
- `BOUGHT`: `"bought"`
- `REJECTED`: `"rejected"`

Example:

```js
import { SALE_STATUS } from "negotiation-flow";

const status = SALE_STATUS.SUBMITTED;
```

## Important Notes

- This package manages negotiation logic; it does not save data to a database.
- Your application is responsible for persisting the returned `saleRequest`.
- Your application should authenticate and authorize users before allowing them to create offers or respond to them.
- The package does not provide a user interface, API server, or payment processing.
- The maximum negotiation-round limit is currently `5`.
- Validate and test the package against your application's requirements before using it in production.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
