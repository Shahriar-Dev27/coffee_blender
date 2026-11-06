// Every visible string lives here. The voice is a placeholder until the brand supplies one.
export const COPY_STATUS = 'placeholder: brand voice not supplied' as const;

export const COPY = {
  wordmark: 'BREOU',
  skipLink: 'Skip to your order',
  noscript: 'Turn on JavaScript to build and order a cup.',
  hero: {
    headline: 'One cup, made while you scroll.',
    sentence: 'Choose the blend, roast and milk, then order it for pickup.',
    action: 'Build your cup',
  },
  stages: {
    2: { heading: 'The blend', caption: (blend: string) => `${blend}, turning around the cup.` },
    3: { heading: 'Beans in', caption: 'The beans fall in and become espresso.' },
    4: {
      heading: 'Milk, then something sweet',
      caption: 'Each extra lands in the cup as you choose it.',
    },
    5: { heading: 'Your cup', caption: 'Change anything. The cup and the price follow.' },
  },
  callouts: { milkNone: 'No milk', sweetenerNone: 'No sweetener' },
  panel: {
    heading: 'Build your cup',
    legends: {
      size: 'Size',
      blend: 'Blend',
      roast: 'Roast',
      milk: 'Milk',
      sweetener: 'Sweetener',
    },
    priceLabel: 'Price',
    addToOrder: 'Add to order',
    placeOrder: 'Place order',
    expand: 'Show options',
    collapse: 'Hide options',
    added: (count: number) => `Added. ${count} in your order.`,
    atLimit: 'That cup is already at 10. Change the quantity in your order.',
  },
  cart: { button: (count: number) => (count === 0 ? 'Your order' : `Your order (${count})`) },
  drawer: {
    title: 'Your order',
    close: 'Close',
    empty: 'Nothing here yet.',
    emptyAction: 'Build your cup',
    quantity: 'Quantity',
    increase: 'One more',
    decrease: 'One fewer',
    remove: 'Remove',
    subtotal: 'Subtotal',
  },
  form: {
    legend: 'Pickup details',
    name: 'Name',
    email: 'Email',
    slot: 'Pickup time',
    slotPlaceholder: 'Choose a time',
    submit: 'Confirm order',
    submitting: 'Confirming',
    failed: 'That did not go through. Try again.',
    errors: {
      name: {
        required: 'Enter your name.',
        tooLong: 'Keep your name under 80 characters.',
        invalid: 'Enter your name.',
      },
      email: {
        required: 'Enter your email address.',
        invalid: 'Write it as name@example.com.',
        tooLong: 'That address is too long.',
      },
      slotId: {
        required: 'Choose a pickup time.',
        invalid: 'Choose a pickup time from the list.',
        tooLong: 'Choose a pickup time.',
      },
    },
  },
  confirmation: {
    heading: (n: string) => `Demo order ${n}`,
    note: 'This is a demo checkout. Nothing was sent and nothing was charged.',
    pickup: (name: string, slot: string) => `For ${name}, ${slot.toLowerCase()}.`,
    newOrder: 'Start a new order',
  },
  footer: { note: 'A demo storefront. No order is sent and nothing is charged.' },
} as const;
