import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import type {
  CustomerAppointmentHistoryItem,
  CustomerFileRecord,
  CustomerProfile,
  PaginatedResponse,
} from "@xenior/types";
import { memoryStorage } from "multer";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { CUSTOMER_FILE_MAX_BYTES } from "./customer-files.constants";
import {
  CreateCustomerDto,
  CustomerHistoryQueryDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
  UploadCustomerFileDto,
} from "./dto/customer.dto";
import { CustomersService } from "./customers.service";

const readRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("customers")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(
    @Query() query: ListCustomersQueryDto,
  ): Promise<PaginatedResponse<CustomerProfile>> {
    return this.customers.list(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  create(@Body() input: CreateCustomerDto): Promise<CustomerProfile> {
    return this.customers.create(input);
  }

  @Get(":id/appointments")
  @RequireBusinessRoles(...readRoles)
  listAppointments(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query() query: CustomerHistoryQueryDto,
  ): Promise<PaginatedResponse<CustomerAppointmentHistoryItem>> {
    return this.customers.listAppointments(id, query);
  }

  @Get(":id/files")
  @RequireBusinessRoles(...readRoles)
  listFiles(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<CustomerFileRecord[]> {
    return this.customers.listFiles(id);
  }

  @Post(":id/files")
  @RequireBusinessRoles(...writeRoles)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: CUSTOMER_FILE_MAX_BYTES },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["kind", "file"],
      properties: {
        kind: { type: "string", enum: ["KVKK", "SIGNED_FORM", "OTHER"] },
        file: { type: "string", format: "binary" },
      },
    },
  })
  uploadFile(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UploadCustomerFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CustomerFileRecord> {
    return this.customers.uploadFile(id, {
      kind: input.kind,
      originalName: file?.originalname ?? "file",
      contentType: file?.mimetype ?? "",
      sizeBytes: file?.size ?? 0,
      body: file?.buffer ?? Buffer.alloc(0),
    });
  }

  @Get(":id/files/:fileId/content")
  @RequireBusinessRoles(...readRoles)
  @Header("Cache-Control", "private, no-store")
  async downloadFile(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("fileId", new ParseUUIDPipe({ version: "4" })) fileId: string,
  ): Promise<StreamableFile> {
    const file = await this.customers.getFileContent(id, fileId);
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: contentDisposition(file.originalName),
      length: file.body.length,
    });
  }

  @Delete(":id/files/:fileId")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("fileId", new ParseUUIDPipe({ version: "4" })) fileId: string,
  ): Promise<void> {
    await this.customers.deleteFile(id, fileId);
  }

  @Get(":id")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<CustomerProfile> {
    return this.customers.get(id);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateCustomerDto,
  ): Promise<CustomerProfile> {
    return this.customers.update(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.customers.deactivate(id);
  }
}

function contentDisposition(originalName: string): string {
  const ascii = originalName.replace(/[^\w.\- ()]/g, "_");
  return `attachment; filename="${ascii || "file"}"; filename*=UTF-8''${encodeURIComponent(originalName)}`;
}
