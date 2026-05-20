import { FilterQuery, Query } from "mongoose";

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  // Search method (arrayFields: e.g. ["tags"] for string[] columns)
  search(searchableFields: string[], arrayFields: string[] = []) {
    const searchTerm = this?.query?.searchTerm;
    if (searchTerm) {
      const term = String(searchTerm).trim();
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      this.modelQuery = this.modelQuery?.find({
        $or: searchableFields.map((field) => {
          if (arrayFields.includes(field)) {
            // Match any tag in the array (partial, case-insensitive)
            return { [field]: { $regex: escaped, $options: "i" } };
          }
          return { [field]: { $regex: escaped, $options: "i" } };
        }) as FilterQuery<T>[],
      });
    }

    return this;
  }

  // Filter method
  filter() {
    const filterQueries = { ...this.query };
    const excludedFields = ["searchTerm", "page", "limit", "sortBy", "sortOrder", "fields"];

    excludedFields.forEach((field) => {
      delete filterQueries[field];
    });

    this.modelQuery = this.modelQuery?.find(filterQueries as FilterQuery<T>);

    return this;
  }

  // Sort method
  sort() {
    const sort = (this.query?.sort as string)?.split(",")?.join(" ") || "-createdAt";

    this.modelQuery = this?.modelQuery?.sort(sort);

    return this;
  }

  // paginate method
  paginate() {
    const page = parseInt(this.query?.page as string, 10) || 1;
    const limit = parseInt(this.query?.limit as string, 10) || 1000;

    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery?.skip(skip)?.limit(limit);

    return this;
  }

  // define which fields to return
  fields() {
    const fields = (this.query?.fields as string)?.split(",")?.join(" ") || "-__v";

    this.modelQuery = this.modelQuery?.select(fields);

    return this;
  }

  // count total (meta) documents
  async countTotal() {
    const totalQueries = this.modelQuery.getFilter();

    // return total documents, total pages, current page, limit per page.
    const totalDocuments = await this.modelQuery.model.countDocuments(totalQueries);
    const totalPages = Math.ceil(totalDocuments / ((this.query?.limit as number) || 1000));
    const currentPage = (this.query?.page as number) || 1;
    const limitPerPage = (this.query?.limit as number) || 1000;

    return { totalDocuments, totalPages, currentPage, limitPerPage };
  }
}

export default QueryBuilder;
