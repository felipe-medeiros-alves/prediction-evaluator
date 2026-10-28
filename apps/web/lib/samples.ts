import caseExample from '../../../examples/case-example.json';
import claimDocuments from '../../../examples/claim-documents.json';

export interface Sample {
  key: string;
  label: string;
  description: string;
  batch: unknown;
}

export const samples: Sample[] = [
  {
    key: 'case-example',
    label: 'Case 06 example (cat / dog)',
    description: 'The worked example from the challenge: one decision of each kind, an invalid sum and a duplicate.',
    batch: caseExample,
  },
  {
    key: 'claim-documents',
    label: 'Claim document triage',
    description:
      'A classifier routing claim attachments. Abstentions are the documents that would go to a human adjuster.',
    batch: claimDocuments,
  },
];
