import { Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { SectionCard } from "@/renderer/components/SectionCard";
import { Button } from "@/renderer/components/ui/button";
import { Input } from "@/renderer/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/renderer/components/ui/select";
import type { InputDeviceMappingProfile } from "@/shared/input-devices";

interface MappingProfileCardProps {
  activeProfileId: string;
  onActivateProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onDeleteProfile: () => void;
  onProfileNameChange: (name: string) => void;
  onSaveProfile: () => void;
  profile: InputDeviceMappingProfile;
  profileIsSafe: boolean;
  profiles: InputDeviceMappingProfile[];
  saveState: "idle" | "saving" | "saved" | "error";
}

const getSaveStateLabel = (
  saveState: MappingProfileCardProps["saveState"],
  profileIsSafe: boolean,
): string => {
  if (saveState === "saving") return "Saving...";
  if (saveState === "saved") return "Saved";
  if (saveState === "error") return "Save failed";
  return profileIsSafe ? "Ready" : "Deadman required";
};

export const MappingProfileCard = ({
  activeProfileId,
  onActivateProfile,
  onCreateProfile,
  onDeleteProfile,
  onProfileNameChange,
  onSaveProfile,
  profile,
  profileIsSafe,
  profiles,
  saveState,
}: MappingProfileCardProps) => (
  <SectionCard
    className="input-devices-profile-panel"
    contentClassName="input-devices-profile"
    icon={SlidersHorizontal}
    title="Mapping profile"
    action={
      <span className="input-devices-save-state" data-state={saveState}>
        {getSaveStateLabel(saveState, profileIsSafe)}
      </span>
    }
  >
    <div className="input-devices-profile-field">
      <span className="ctrl-section-label">Active profile</span>
      <Select value={activeProfileId} onValueChange={onActivateProfile}>
        <SelectTrigger>
          <SelectValue placeholder="Select profile" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="input-devices-profile-field">
      <span className="ctrl-section-label">Profile name</span>
      <Input
        value={profile.name}
        onChange={(event) => onProfileNameChange(event.target.value)}
      />
    </div>
    <div className="input-devices-save">
      <Button type="button" variant="outline" onClick={onCreateProfile}>
        <Plus />
        New
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onDeleteProfile}
        disabled={saveState === "saving"}
      >
        <Trash2 />
        Delete
      </Button>
      <Button
        type="button"
        onClick={onSaveProfile}
        disabled={saveState === "saving"}
      >
        <Save />
        Save profile
      </Button>
    </div>
  </SectionCard>
);
