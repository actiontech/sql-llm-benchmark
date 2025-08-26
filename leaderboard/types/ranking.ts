export interface Model {
    id: string;
    name: string;
    real_model_namne: string;
    description: string;
    releaseDate: string;
    type: string;
    parameters: string;
    organization: string;
    website: string;
    scores: Record<
        string,
        {
            ability_score: number;
            indicator_score: {
                indicator_actual_score: number;
                indicator_name: string;
            }[];
        }
    >;
    total_score?: number;
}

export interface RankingPageProps {
    months: string[];
    logoInfo: Record<string, string>;
}

export interface Answer {
    case_evaluation_count: number;
    model_answer: string;
}

export interface CaseData {
    case_id: string;
    case_description: string;
    expected_output: string;
    actual_output: string;
    evaluation_result: string;
    score: number;
    reason: string;
    rule_id?: string;
    case_content: string;
    mode_question: string;
    model_answers: Answer[];
}

export interface EvaluationCaseReport {
    indicator_name: string;
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    pass_rate: number;
    average_score: number;
    case_datas: CaseData[];
    indicator_weight?: number;
    evaluation_type?: string;
    case_pass_count?: number;
    case_wrong_count?: number;
    correct_rate?: number;
}

export interface LogFile {
    originalFilename: string;
    i18nKey: string;
}

export interface DetailProps {
    model: Model | null;
    evaluationDimensions: string[];
    initialEvaluationCaseReports: EvaluationCaseReport[] | null;
    initialLogFiles: Record<string, LogFile[]>;
    initialLogContent: string;
    initialSelectedLogFile: string | null;
    date: string;
    id: string;
} 