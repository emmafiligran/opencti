import { caseSensitiveDuplicatedId, caseSensitiveDuplicatedIdDryRun } from './operations/caseSensitiveDuplicatedId';
import type { AuthContext } from '../../types/user';
import { ENTITY_TYPE_ATTACK_PATTERN, ENTITY_TYPE_COURSE_OF_ACTION } from '../../schema/stixDomainObject';
import conf from '../../config/conf';

export type ExecutionType = 'run_once'; // For now, we only need one, but later we will have 'on_demand', 'periodic' or 'live' scripts.
// Map of entity_type or relation_type to the number of impacted elements
export type ImpactedElementsMap = Record<string, number>;

// Default number of elements processed by an operation during a single dataSanityManager cycle,
// can be overridden globally via config and per-operation via the `batch_size` field.
export const DEFAULT_SANITY_OPERATION_BATCH_SIZE = conf.get('data_sanity_manager:default_batch_size') || 500;

export interface SanityOperationRunOutput {
  impact: {
    total: number;
    detail: ImpactedElementsMap; // detailed estimated impacted elements per entity/relation type
  };
  // true if the operation still has work left to do (batch_size was reached before completion).
  // When true, the scheduler will run the operation again on the next cycle even without a force_run.
  hasMore?: boolean;
}

export interface SanityOperation {
  identifier: string; // unique name to identify the sanity operation
  execution_type: ExecutionType;
  eligibleEntityTypes: string[];
  // Maximum number of elements processed in a single dataSanityManager cycle. Remaining elements
  // are kept for later and processed on subsequent cycles. Defaults to DEFAULT_SANITY_OPERATION_BATCH_SIZE.
  batch_size?: number;

  // dry run: returns estimated impact without modifying data, this function should be fast to run.
  dryRun: (context: AuthContext) => Promise<SanityOperationRunOutput>;

  // actual run: applies the operation (up to batchSize elements) and returns impact
  operationRun: (context: AuthContext, batchSize: number) => Promise<SanityOperationRunOutput>;

  // Description of the operations that will be displayed on UI
  description: string;
  // Human-readable short name
  display_name: string;
}

/*
  Hard coded list of available operations
 */
const CASE_SENSITIVE_DUPLICATED_ID_ENTITY_TYPES = [ENTITY_TYPE_ATTACK_PATTERN, ENTITY_TYPE_COURSE_OF_ACTION];

const SANITY_OPERATIONS: SanityOperation[] = [
  {
    identifier: 'caseSensitiveDuplicatedId',
    dryRun: caseSensitiveDuplicatedIdDryRun(CASE_SENSITIVE_DUPLICATED_ID_ENTITY_TYPES),
    operationRun: caseSensitiveDuplicatedId(CASE_SENSITIVE_DUPLICATED_ID_ENTITY_TYPES),
    execution_type: 'run_once',
    description: 'Find attack pattern or course of action that are duplicated when ignoring case and merge duplicates.',
    display_name: 'Case sensitive Duplicated ID',
    eligibleEntityTypes: CASE_SENSITIVE_DUPLICATED_ID_ENTITY_TYPES,
    batch_size: DEFAULT_SANITY_OPERATION_BATCH_SIZE,
  },
];

export const sanityOperationList = () => {
  return SANITY_OPERATIONS;
};
