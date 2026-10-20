// What customers can book, from the smallest job to the biggest,
// plus one-off jobs and emergencies. Prices come from the `rates` table.

export type Size = 'quick' | 'standard' | 'bigger' | 'project' | 'adhoc' | 'emergency' | 'plan';

export type Job = {
  id: string;
  size: Size;
  name: string;
  trade: string;
  check: string;
  unit?: string;
  go?: string;
};

export const SIZES: { key: Size; label: string; hint: string; height: number }[] = [
  { key: 'quick', label: 'Quick fix', hint: 'One visit, small parts', height: 8 },
  { key: 'standard', label: 'Standard job', hint: 'Replace or install one thing', height: 16 },
  { key: 'bigger', label: 'Bigger job', hint: 'A room, a few days', height: 26 },
  { key: 'project', label: 'Whole project', hint: 'Renovate several rooms', height: 38 },
];

export const JOBS: Job[] = [
  { id: 'aircon-service', size: 'quick', name: 'Aircon general servicing', trade: 'Aircon', check: 'BCA-trained technician', unit: 'per unit' },
  { id: 'choked-sink', size: 'quick', name: 'Clear a choked sink or floor trap', trade: 'Plumbing', check: 'PUB licensed plumber' },
  { id: 'replace-tap', size: 'quick', name: 'Replace a tap', trade: 'Plumbing', check: 'PUB licensed plumber' },
  { id: 'light-fitting', size: 'quick', name: 'Replace a light or ceiling fan', trade: 'Electrical', check: 'Licensed electrical worker' },
  { id: 'curtain-rod', size: 'quick', name: 'Put up curtain rods or shelves', trade: 'Handyman', check: 'References checked' },
  { id: 'door-lock', size: 'quick', name: 'Change a door lock or handle', trade: 'Handyman', check: 'References checked' },
  { id: 'mattress-clean', size: 'quick', name: 'Mattress cleaning', trade: 'Cleaning', check: 'References checked', unit: 'per mattress' },
  { id: 'curtain-clean', size: 'quick', name: 'Curtain cleaning, take down and rehang', trade: 'Cleaning', check: 'References checked', unit: 'per window' },
  { id: 'toilet-bowl', size: 'standard', name: 'Replace a toilet bowl', trade: 'Plumbing', check: 'PUB licensed plumber' },
  { id: 'water-heater', size: 'standard', name: 'Replace a water heater', trade: 'Plumbing', check: 'PUB plumber and electrician' },
  { id: 'aircon-leak', size: 'standard', name: 'Fix a leaking aircon', trade: 'Aircon', check: 'BCA-trained technician' },
  { id: 'power-points', size: 'standard', name: 'Add or move power points', trade: 'Electrical', check: 'Licensed electrical worker', unit: 'per point' },
  { id: 'paint', size: 'standard', name: 'Repaint a room', trade: 'Painting', check: 'References checked', unit: 'per room' },
  { id: 'furniture-assembly', size: 'standard', name: 'Assemble or dismantle furniture', trade: 'Handyman', check: 'References checked' },
  { id: 'sofa-reupholster', size: 'standard', name: 'Replace sofa leather or fabric', trade: 'Furniture & design', check: 'Material samples shown first', unit: 'per seat' },
  { id: 'curtains-new', size: 'standard', name: 'Measure and install curtains or blinds', trade: 'Furniture & design', check: 'Fabric samples shown first', unit: 'per window' },
  { id: 'pest-control', size: 'standard', name: 'Pest control: cockroaches, ants, termites', trade: 'Pest control', check: 'NEA-registered pest control company' },
  { id: 'furniture-repair', size: 'standard', name: 'Repair a chair, table or cabinet', trade: 'Furniture & design', check: 'References checked' },
  { id: 'bath-overlay', size: 'bigger', name: 'Bathroom tile overlay', trade: 'Tiling', check: 'References checked', unit: 'per m²' },
  { id: 'vinyl', size: 'bigger', name: 'Vinyl flooring for a room', trade: 'Flooring', check: 'References checked', unit: 'per m²' },
  { id: 'kitchen-cab', size: 'bigger', name: 'New kitchen cabinets', trade: 'Carpentry', check: 'References checked', unit: 'per m run' },
  { id: 'aircon-install', size: 'bigger', name: 'Install a new aircon system', trade: 'Aircon', check: 'BCA-trained technician' },
  { id: 'window-replace', size: 'bigger', name: 'Replace windows', trade: 'Windows', check: 'Approved window contractor' },
  { id: 'plan', size: 'project', name: 'Plan a whole-flat or multi-room renovation', trade: 'Renovation', check: 'One checked pro per trade', go: '/renovate' },
  { id: 'moving-help', size: 'adhoc', name: 'Move a few big items', trade: 'Moving', check: 'References checked' },
  { id: 'event-setup', size: 'adhoc', name: 'Set up for a party or event at home', trade: 'Handyman', check: 'References checked' },
  { id: 'clean', size: 'adhoc', name: 'Deep clean after renovation or moving', trade: 'Cleaning', check: 'References checked' },
  { id: 'odd-jobs', size: 'adhoc', name: 'A list of odd jobs in one visit', trade: 'Handyman', check: 'References checked' },
  { id: 'other', size: 'adhoc', name: 'Something else', trade: 'Other', check: "We'll find the right pro" },
  { id: 'burst-pipe', size: 'emergency', name: 'Burst pipe or water leaking now', trade: 'Plumbing', check: 'PUB licensed plumber' },
  { id: 'no-power', size: 'emergency', name: "Power tripped and won't reset", trade: 'Electrical', check: 'Licensed electrical worker' },
  { id: 'flooding', size: 'emergency', name: 'Toilet or drain overflowing', trade: 'Plumbing', check: 'PUB licensed plumber' },
  { id: 'locked-out', size: 'emergency', name: 'Locked out of my home', trade: 'Handyman', check: 'References checked' },
  { id: 'care-plan', size: 'plan', name: 'Home care plan', trade: 'Other', check: 'Yearly visits by checked pros' },
];

export const AREAS = ['Bedok', 'Tampines', 'Pasir Ris', 'Simei', 'Changi', 'Paya Lebar', 'Geylang', 'Marine Parade', 'Punggol', 'Sengkang'];

export const TRADES = ['Plumbing', 'Electrical', 'Aircon', 'Handyman', 'Painting', 'Tiling', 'Flooring', 'Carpentry', 'Upholstery', 'Windows', 'Cleaning', 'Pest control', 'Moving', 'Furniture & design', 'Other'];

export const URGENCY = ['Emergency, now', 'Same day', 'This week', 'Flexible', 'On a set date'];

// Renovation planner: the order trades have to work in.
export const STEPS = ['Hacking and removal', 'Plumbing and electrical', 'Tiling and flooring', 'Carpentry', 'Doors and windows', 'Painting', 'Cleaning'];

export type RenoTask = { id: string; room: string; label: string; trade: string; unit: string; qty: number; step: number };

export const RENO_TASKS: RenoTask[] = [
  { id: 'hack-tiles', room: 'Kitchen and bathrooms', label: 'Hack out old floor tiles', trade: 'Hacking', unit: 'm²', qty: 10, step: 0 },
  { id: 'basin-tap', room: 'Kitchen and bathrooms', label: 'Replace basin and tap', trade: 'Plumbing', unit: 'set', qty: 2, step: 1 },
  { id: 'bath-overlay', room: 'Kitchen and bathrooms', label: 'Overlay bathroom wall and floor tiles', trade: 'Tiling', unit: 'm²', qty: 20, step: 2 },
  { id: 'kitchen-cab', room: 'Kitchen and bathrooms', label: 'Kitchen cabinets, top and bottom', trade: 'Carpentry', unit: 'm run', qty: 4, step: 3 },
  { id: 'vinyl', room: 'Living and bedrooms', label: 'Vinyl flooring', trade: 'Flooring', unit: 'm²', qty: 60, step: 2 },
  { id: 'wardrobe', room: 'Living and bedrooms', label: 'Built-in wardrobe', trade: 'Carpentry', unit: 'm run', qty: 2, step: 3 },
  { id: 'door', room: 'Living and bedrooms', label: 'Replace bedroom door', trade: 'Handyman', unit: 'door', qty: 1, step: 4 },
  { id: 'power-points', room: 'Whole home', label: 'Add or move power points', trade: 'Electrical', unit: 'point', qty: 4, step: 1 },
  { id: 'lights', room: 'Whole home', label: 'Replace light fittings', trade: 'Electrical', unit: 'fitting', qty: 6, step: 1 },
  { id: 'paint', room: 'Whole home', label: 'Repaint walls and ceilings', trade: 'Painting', unit: 'room', qty: 5, step: 5 },
  { id: 'clean', room: 'Whole home', label: 'Post-renovation cleaning', trade: 'Cleaning', unit: 'job', qty: 1, step: 6 },
];
