# GBROS POS

Point-of-Sale system for retail store inventory management, point-of-sale checkout, cash register tracking, and sales analytics.

## Language

**Sale**:
A finalized retail transaction recording total price, payment received, change given, timestamp, and purchased line items.
_Avoid_: Order, invoice, ticket

**Line Item**:
A single product or product variant entry within a Sale, capturing quantity, unit price, and subtotal at the moment of sale.
_Avoid_: Detalle, sale item, cart entry

**Sale Session**:
The active point-of-sale interaction managing selected products, quantities, and payment input prior to completing a Sale.
_Avoid_: Cart, checkout flow, basket

**Product**:
A salable inventory article identified by SKU, with title, price, cost, and stock count.
_Avoid_: Item, article, merchandise

**Variant**:
A specific variation of a Product (e.g., color) with independent stock tracking.
_Avoid_: Option, sub-product, modifier
