import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { OfficialDocumentRecord } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { IssueOfficialDocumentDto } from "./dto/invoicing.dto";
import { OfficialDocumentsService } from "./official-documents.service";

const readRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const writeRoles = ["BUSINESS_OWNER", "ACCOUNTANT"] as const;

@ApiTags("ledger")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("sales")
export class OfficialDocumentsController {
  constructor(private readonly documents: OfficialDocumentsService) {}

  @Post(":id/official-document")
  @RequireBusinessRoles(...writeRoles)
  issue(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: IssueOfficialDocumentDto,
  ): Promise<OfficialDocumentRecord> {
    return this.documents.issue(id, input);
  }

  @Get(":id/official-document")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<OfficialDocumentRecord> {
    return this.documents.get(id);
  }
}
