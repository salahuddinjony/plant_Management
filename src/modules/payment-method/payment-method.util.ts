import httpStatus from "http-status";
import AppError from "../../errors/AppError";

export const assertBankBranchName = (accountType: string, branchName?: string | null) => {
    if (accountType === "Bank" && !branchName?.trim()) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Branch name is required when account type is Bank"
        );
    }
};
