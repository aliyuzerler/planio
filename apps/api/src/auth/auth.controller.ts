import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type {
  AuthSessionResponse,
  CurrentUserResponse,
  RegisterPendingResponse,
} from "@xenior/types";
import { Throttle } from "@nestjs/throttler";
import { SkipTenant } from "../authorization/authorization.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AuthService } from "./auth.service";
import {
  AcceptStaffInviteDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth-tokens.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Create a business owner account" })
  @ApiCreatedResponse({
    description:
      "Account created; email verification required (session only in test)",
  })
  @ApiConflictResponse({ description: "Email already registered" })
  register(
    @Body() input: RegisterDto,
  ): Promise<AuthSessionResponse | RegisterPendingResponse> {
    return this.authService.register(input);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with email and password" })
  @ApiOkResponse({ description: "Session created" })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  login(@Body() input: LoginDto): Promise<AuthSessionResponse> {
    return this.authService.login(input);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate a refresh token" })
  @ApiOkResponse({ description: "Token pair rotated" })
  @ApiUnauthorizedResponse({ description: "Refresh token invalid or expired" })
  refresh(@Body() input: RefreshTokenDto): Promise<AuthSessionResponse> {
    return this.authService.refresh(input);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the current refresh session" })
  @ApiNoContentResponse({ description: "Session revoked" })
  async logout(@Body() input: RefreshTokenDto): Promise<void> {
    await this.authService.logout(input);
  }

  @Get("me")
  @SkipTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user and memberships" })
  @ApiOkResponse({ description: "Current user" })
  @ApiUnauthorizedResponse({ description: "Authentication required" })
  me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserResponse> {
    return this.authService.getCurrentUser(user.userId);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() input: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(input);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() input: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(input);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Email verified and session created" })
  verifyEmail(
    @Body() input: VerifyEmailDto,
  ): Promise<AuthSessionResponse> {
    return this.authService.verifyEmail(input);
  }

  @Public()
  @Post("accept-invite")
  @HttpCode(HttpStatus.OK)
  acceptInvite(
    @Body() input: AcceptStaffInviteDto,
  ): Promise<AuthSessionResponse> {
    return this.authService.acceptStaffInvite(input);
  }
}
